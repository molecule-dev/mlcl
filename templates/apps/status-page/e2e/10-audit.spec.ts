import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  createComponent,
  createIncident,
  createMaintenance,
  createSubscriber,
  createTeamMember,
  listAudit,
  listAuditFiltered,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/audit', () => {
  test('every CRUD action writes a real audit row scoped to the current user', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `audit-${Date.now()}` })
    const inc = await createIncident(page, {
      title: `audit-inc-${Date.now()}`,
      affected: [c.id],
    })
    const m = await createMaintenance(page, {
      title: `audit-mx-${Date.now()}`,
      scheduledFor: new Date(Date.now() + 60_000).toISOString(),
      scheduledUntil: new Date(Date.now() + 120_000).toISOString(),
      affected: [c.id],
    })
    const s = await createSubscriber(page, { email: uniqueEmail('audit-sub') })
    const tm = await createTeamMember(page, {
      name: 'Audit Tester',
      email: uniqueEmail('audit-team'),
    })

    const all = await listAudit(page)
    const actions = all.map((a) => a.action)
    const targets = new Set(all.map((a) => a.target))

    expect(actions, `audit actions seen: ${actions.join(',')}`).toEqual(
      expect.arrayContaining([
        'component.create',
        'incident.create',
        'maintenance.create',
        'subscriber.create',
        'team.create',
      ]),
    )
    expect(targets.has(c.id)).toBeTruthy()
    expect(targets.has(inc.id)).toBeTruthy()
    expect(targets.has(m.id)).toBeTruthy()
    expect(targets.has(s.id)).toBeTruthy()
    expect(targets.has(tm.id)).toBeTruthy()
  })

  test('audit page renders entries from the API for the current user', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `audit-page-${Date.now()}` })

    await page.goto(APP_BASE + '/audit')
    await expect(page.getByRole('heading', { name: /audit/i })).toBeVisible({ timeout: 15_000 })
    const body = await page.locator('body').innerText()
    // The component name we just created should be referenced as the
    // most recent audit entry's summary.
    expect(body).toContain(c.name)
  })

  test('audit query filters work for scope and target', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `audit-filt-${Date.now()}` })
    await createIncident(page, { title: `audit-filt-inc-${Date.now()}`, affected: [c.id] })

    const onlyComponents = await listAuditFiltered(page, { scope: 'components' })
    expect(onlyComponents.length).toBeGreaterThan(0)
    expect(onlyComponents.every((a) => a.action.startsWith('component.'))).toBeTruthy()

    const onlyTarget = await listAuditFiltered(page, { target: c.id })
    expect(onlyTarget.every((a) => a.target === c.id)).toBeTruthy()
  })

  test('audit page issues GET /api/audit on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/audit')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => /\/api\/audit(\?|$)/.test(r.url) && r.method === 'GET')
    expect(get?.status, 'GET /api/audit').toBe(200)
  })
})
