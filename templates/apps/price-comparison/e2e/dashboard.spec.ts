import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  listProducts,
  listWatchlist,
  seedCatalog,
  signup,
  uniqueEmail,
  authHeaders,
  API_BASE,
} from './_helpers.js'

test.describe('/dashboard', () => {
  test('shell renders after signup', async ({ page }) => {
    await signup(page, uniqueEmail('dash-shell'))
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-test=dashboard-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('Watching count KPI reflects watchlist length', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-watch'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    const target = products[0]
    expect(target).toBeTruthy()
    await page.request.post(`${API_BASE}/watchlist`, {
      headers: authHeaders(accessToken),
      data: { productId: target.id },
    })
    const list = await listWatchlist(page, accessToken)
    expect(list.length).toBeGreaterThanOrEqual(1)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-test=dashboard-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('Drops this week KPI is rendered', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-drops'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-test=dashboard-page]')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/drops/i).first()).toBeVisible()
  })

  test('Lifetime savings KPI is rendered', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-save'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-test=dashboard-page]')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/savings/i).first()).toBeVisible()
  })

  test('Expiring alerts KPI is rendered', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-alerts'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-test=dashboard-page]')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/alerts?/i).first()).toBeVisible()
  })

  test('Trending products grid populates from API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-trend'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-test=dashboard-page]')).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(1500)
    const cards = page.locator('a[href^="/products/"]')
    await expect(cards.first()).toBeAttached()
  })

  test('Recent activity / notifications feed shows up', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-feed'))
    await seedCatalog(page, accessToken)
    // The dashboard mount fires four parallel GETs. Wait deterministically
    // for each before closing the captureNetwork block — waitForTimeout
    // wasn't enough for the slowest call (/prices/trends/drops) on cold
    // caches, which left dropsCall undefined and failed the test.
    const matchers: Array<(url: string, method: string) => boolean> = [
      (url, method) => /\/api\/watchlist(\?|$)/.test(url) && method === 'GET',
      (url, method) => /\/api\/alerts(\?|$)/.test(url) && method === 'GET',
      (url, method) => /\/api\/prices\/trends\/drops/.test(url) && method === 'GET',
      (url, method) => /\/api\/notifications/.test(url) && method === 'GET',
    ]
    const reqs = await captureNetwork(page, async () => {
      const responses = matchers.map((m) =>
        page.waitForResponse((r) => m(r.url(), r.request().method()), { timeout: 20_000 }),
      )
      await page.goto(APP_BASE + '/dashboard')
      await expect(page.locator('[data-test=dashboard-page]')).toBeVisible({ timeout: 15_000 })
      await Promise.all(responses)
    })
    const watchlistCall = reqs.find(
      (r) => /\/api\/watchlist(\?|$)/.test(r.url) && r.method === 'GET',
    )
    const alertsCall = reqs.find((r) => /\/api\/alerts(\?|$)/.test(r.url) && r.method === 'GET')
    const dropsCall = reqs.find(
      (r) => /\/api\/prices\/trends\/drops/.test(r.url) && r.method === 'GET',
    )
    const notifCall = reqs.find((r) => /\/api\/notifications/.test(r.url) && r.method === 'GET')
    expect(watchlistCall?.status, 'GET /api/watchlist').toBe(200)
    expect(alertsCall?.status, 'GET /api/alerts').toBe(200)
    expect(dropsCall?.status, 'GET /api/prices/trends/drops').toBe(200)
    expect(notifCall?.status, 'GET /api/notifications').toBe(200)
  })
})
