import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listIncidents, signup, triggerIncident, uniqueEmail } from './_helpers.js'

test.describe('/incidents', () => {
  test('anonymous redirected off /incidents', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/incidents')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 15_000 })
  })

  test('renders seeded incidents as rows', async ({ page }) => {
    await signup(page, uniqueEmail('inc-list'))
    const incidents = await listIncidents(page)
    expect(incidents.length, 'seed provisions incidents').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/incidents')
    await page.waitForLoadState('networkidle')
    const first = incidents[0]!
    const row = page.locator(`[data-mol-id="incident-row-${first.id}"]`)
    await expect(row.first()).toBeVisible()
    await expect(row.first()).toContainText(first.service)
  })

  test('status filter chips narrow the list', async ({ page }) => {
    await signup(page, uniqueEmail('inc-filter'))
    await page.goto(APP_BASE + '/incidents')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="incidents-filter-open"]').first()).toBeVisible()
    await page.locator('[data-mol-id="incidents-filter-resolved"]').first().click()
    await page.waitForTimeout(300)
    const resolved = await listIncidents(page)
    const resolvedRows = await page.locator('[data-mol-id^="incident-row-"]').count()
    expect(resolvedRows).toBe(resolved.filter((i) => i.status === 'resolved').length)
  })

  test('search box filters by service text', async ({ page }) => {
    await signup(page, uniqueEmail('inc-search'))
    const incidents = await listIncidents(page)
    const target = incidents.find((i) => i.status !== 'resolved') ?? incidents[0]!
    await page.goto(APP_BASE + '/incidents')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="incidents-search"]').fill(target.service)
    await page.waitForTimeout(300)
    const rows = page.locator('[data-mol-id^="incident-row-"]')
    expect(await rows.count()).toBeGreaterThan(0)
    for (let i = 0; i < (await rows.count()); i++) {
      await expect(rows.nth(i)).toContainText(target.service)
    }
  })

  test('triggering an incident via the API makes it appear in the list', async ({ page }) => {
    await signup(page, uniqueEmail('inc-new'))
    const created = await triggerIncident(page, {
      title: `E2E synthetic check failure ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'warning',
    })
    expect(created.status).toBe('triggered')
    await page.goto(APP_BASE + '/incidents')
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`[data-mol-id="incident-row-${created.id}"]`).first()).toBeVisible()
  })
})
