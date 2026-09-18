import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/stats', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/stats')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  })

  test('renders Stats h1', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Stats$/i, level: 1 })).toBeVisible()
  })

  test('GET /api/reports/overview fires on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/stats')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const get = reqs.find((r) => /\/api\/reports\/overview/.test(r.url) && r.method === 'GET')
    expect(get, 'GET /api/reports/overview should fire on /stats').toBeTruthy()
    expect(get!.status).toBeLessThan(300)
  })

  test('all four KPI labels are visible', async ({ page }) => {
    await expect(page.getByText(/Reviews \(30d\)/i)).toBeVisible()
    await expect(page.getByText(/Current streak/i).first()).toBeVisible()
    await expect(page.getByText(/Retention/i).first()).toBeVisible()
    await expect(page.getByText(/Daily avg/i)).toBeVisible()
  })

  test('reviews-per-day chart has 30 bars', async ({ page }) => {
    const bars = page.locator('[data-mol-id="stats-daily-bars"] > div')
    await expect.poll(async () => bars.count(), { timeout: 10_000 }).toBe(30)
  })

  test('cards-by-state list renders four rows', async ({ page }) => {
    const list = page.locator('[data-mol-id="stats-by-state"] > li')
    await expect.poll(async () => list.count(), { timeout: 10_000 }).toBe(4)
  })
})
