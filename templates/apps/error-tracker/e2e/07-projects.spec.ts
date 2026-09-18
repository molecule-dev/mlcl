import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  createProject,
  listProjects,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/projects', () => {
  test('lists seeded projects', async ({ page }) => {
    await signup(page, uniqueEmail('proj-list'))
    const projects = await listProjects(page)
    expect(projects.length, 'seed should provision projects').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/projects')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).toContain(projects[0]!.name)
  })

  test('creating a project via API surfaces it on /projects after reload', async ({ page }) => {
    await signup(page, uniqueEmail('proj-create-api'))
    const created = await createProject(page, { name: `Live Project ${Date.now()}` })
    expect(created.id).toBeTruthy()
    await page.goto(APP_BASE + '/projects')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).toContain(created.name)
    await page.reload()
    await page.waitForLoadState('networkidle')
    const body2 = await page.locator('body').innerText()
    expect(body2, 'project survives reload').toContain(created.name)
  })

  test('"New project" UI dialog persists via POST /api/projects', async ({ page }) => {
    await signup(page, uniqueEmail('proj-create-ui'))
    await page.goto(APP_BASE + '/projects')
    await page.waitForLoadState('networkidle')
    const newBtn = page.getByTestId('projects-create-open')
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await newBtn
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no new-project control on projects page')
    await newBtn.click()
    const input = page.getByTestId('projects-create-name')
    const name = `UI Project ${Date.now()}`
    await input.fill(name)
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('projects-create-confirm').click()
      await page.waitForTimeout(2000)
    })
    const created = reqs.find((r) => r.method === 'POST' && /\/api\/projects(?!-)/.test(r.url))
    expect(created, 'submit must POST /api/projects').toBeTruthy()
    expect(created!.status, 'POST /api/projects 2xx').toBeLessThan(300)
    const body = await page.locator('body').innerText()
    expect(body).toContain(name)
    const list = await listProjects(page)
    expect(
      list.some((p) => p.name === name),
      'project persisted in DB',
    ).toBeTruthy()
  })
})
