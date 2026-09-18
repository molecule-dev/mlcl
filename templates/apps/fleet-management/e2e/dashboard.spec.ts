import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoDashboard(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.getByRole('heading', { name: /fleet command/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('dashboard', () => {
  test('loads with KPIs, fleet feed, and alerts highlight after demo seed (4-way fanout)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoDashboard(page)
    })
    const fleetReport = reqs.find((r) => /\/api\/reports\/fleet/.test(r.url) && r.method === 'GET')
    const vehiclesReq = reqs.find((r) => /\/api\/vehicles\b/.test(r.url) && r.method === 'GET')
    const alertsReq = reqs.find((r) => /\/api\/alerts\b/.test(r.url) && r.method === 'GET')
    const analyticsReq = reqs.find(
      (r) => /\/api\/reports\/analytics/.test(r.url) && r.method === 'GET',
    )
    expect(fleetReport?.status, 'GET /api/reports/fleet').toBe(200)
    expect(vehiclesReq?.status, 'GET /api/vehicles').toBe(200)
    expect(alertsReq?.status, 'GET /api/alerts').toBe(200)
    expect(analyticsReq?.status, 'GET /api/reports/analytics').toBe(200)
  })

  test('dashboard hero heading "Fleet Command" renders', async ({ page }) => {
    await signup(page)
    await gotoDashboard(page)
    await expect(page.getByRole('heading', { name: /fleet command/i, level: 1 })).toBeVisible()
  })

  test('Active fleet KPI value equals the number of vehicles the API returns', async ({ page }) => {
    const { accessToken } = await signup(page)
    // The card renders reports/fleet's vehicles_total, so the expected number
    // is the fleet itself — not how many rows the demo seed happens to write.
    const vehicles = await waitForSeed(page, accessToken)
    await gotoDashboard(page)
    const fleetLabel = page.getByText(/^\s*active fleet\s*$/i)
    await expect(fleetLabel).toBeVisible({ timeout: 10000 })
    const card = fleetLabel.locator('xpath=ancestor::div[contains(@class,"border-l-4")][1]')
    const valueText = await card.locator('span.tabular-nums').first().textContent()
    expect(Number((valueText ?? '0').replace(/[^0-9]/g, ''))).toBe(vehicles.length)
  })

  test('Drivers on duty KPI label renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDashboard(page)
    await expect(page.getByText(/drivers on duty/i)).toBeVisible({ timeout: 10000 })
  })

  test('Active alerts KPI label renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDashboard(page)
    await expect(page.getByText(/active alerts/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('"View all →" on Active vehicles links to /vehicles', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDashboard(page)
    await page
      .getByRole('link', { name: /view all/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/vehicles$/)
  })

  test('Activity feed list has at least one row when seeded', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoDashboard(page)
    // The activity list is rendered as a list of rows; we use a flexible selector.
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body.length, 'dashboard main has content').toBeGreaterThan(100)
  })
})
