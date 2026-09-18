import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  createAlert,
  listAlerts,
  listProjects,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/alerts', () => {
  test('lists seeded rules', async ({ page }) => {
    await signup(page, uniqueEmail('alerts-list'))
    const rules = await listAlerts(page)
    expect(rules.length, 'seed should provision alert rules').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).toContain(rules[0]!.name)
  })

  test('creating a rule via API surfaces it on /alerts', async ({ page }) => {
    await signup(page, uniqueEmail('alerts-create'))
    const projects = await listProjects(page)
    expect(projects.length).toBeGreaterThan(0)
    const rule = await createAlert(page, {
      name: `New Rule ${Date.now()}`,
      project_id: projects[0]!.id,
    })
    expect(rule.id).toBeTruthy()
    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    const list = await listAlerts(page)
    const created = list.find((r) => r.id === rule.id)
    expect(created, 'rule visible in /api/alerts after create').toBeTruthy()
    expect(body).toContain(created!.name)
  })

  test('Pause/Resume on a rule persists status', async ({ page }) => {
    await signup(page, uniqueEmail('alerts-pause'))
    const projects = await listProjects(page)
    const rule = await createAlert(page, {
      name: `Pausable ${Date.now()}`,
      project_id: projects[0]!.id,
    })
    const put = await page.request.put(`${API_BASE}/alerts/${rule.id}`, {
      headers: authHeaders(page),
      data: { status: 'paused' },
    })
    expect(put.status()).toBeLessThan(300)
    const after = await listAlerts(page)
    expect(after.find((r) => r.id === rule.id)?.status).toBe('paused')
  })

  test('Delete removes rule from /api/alerts', async ({ page }) => {
    await signup(page, uniqueEmail('alerts-delete'))
    const projects = await listProjects(page)
    const rule = await createAlert(page, {
      name: `Doomed ${Date.now()}`,
      project_id: projects[0]!.id,
    })
    const del = await page.request.delete(`${API_BASE}/alerts/${rule.id}`, {
      headers: authHeaders(page),
    })
    expect(del.status()).toBeLessThan(300)
    const list = await listAlerts(page)
    expect(
      list.find((r) => r.id === rule.id),
      'deleted rule disappears',
    ).toBeFalsy()
  })

  test('AlertDetail page renders the rule name', async ({ page }) => {
    await signup(page, uniqueEmail('alerts-detail'))
    const rules = await listAlerts(page)
    if (!rules.length) test.skip()
    await page.goto(APP_BASE + `/alerts/${rules[0]!.id}`)
    await page.waitForLoadState('networkidle')
    expect(await page.locator('body').innerText()).toContain(rules[0]!.name)
  })
})
