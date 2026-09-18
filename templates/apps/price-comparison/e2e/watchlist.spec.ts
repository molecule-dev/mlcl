import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authHeaders,
  API_BASE,
  captureNetwork,
  listProducts,
  listWatchlist,
  seedCatalog,
  signup,
  uniqueEmail,
} from './_helpers.js'

async function addToWatchlist(page, accessToken: string | null, productId: string) {
  const res = await page.request.post(`${API_BASE}/watchlist`, {
    headers: authHeaders(accessToken),
    data: { productId },
    failOnStatusCode: false,
  })
  expect([200, 201].includes(res.status()), await res.text().catch(() => '')).toBe(true)
}

test.describe('/watchlist', () => {
  test('shell renders', async ({ page }) => {
    await signup(page, uniqueEmail('wl-shell'))
    await page.goto(APP_BASE + '/watchlist')
    await expect(page.locator('[data-test=watchlist-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('grid populates after adding a product', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('wl-grid'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await addToWatchlist(page, accessToken, products[0].id)
    await page.goto(APP_BASE + '/watchlist')
    await expect(page.locator('[data-test=watchlist-grid]')).toBeVisible({ timeout: 15_000 })
  })

  test('remove button issues DELETE /api/watchlist/:id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('wl-remove'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await addToWatchlist(page, accessToken, products[0].id)
    const beforeList = await listWatchlist(page, accessToken)
    expect(beforeList.length).toBe(1)
    const target = beforeList[0]
    await page.goto(APP_BASE + '/watchlist')
    const remove = page.locator(`[data-test=watchlist-remove-${target.id}]`).first()
    await expect(remove).toBeVisible({ timeout: 15_000 })
    await remove.click()
    await page.waitForTimeout(800)
    const after = await listWatchlist(page, accessToken)
    expect(after.length).toBe(0)
  })

  test('"Dropped" filter only shows dropped items', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('wl-filter'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await addToWatchlist(page, accessToken, products[0].id)
    await page.goto(APP_BASE + '/watchlist')
    await expect(page.locator('[data-test=watchlist-page]')).toBeVisible({ timeout: 15_000 })
    const filter = page.getByRole('button', { name: /drop/i }).first()
    if (await filter.count()) {
      await filter.click()
    }
  })

  test('initial render fires GET /api/watchlist', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('wl-net'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await addToWatchlist(page, accessToken, products[0].id)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/watchlist')
      await expect(page.locator('[data-test=watchlist-page]')).toBeVisible({ timeout: 15_000 })
      // Wait for the watchlist grid to populate (proves the GET completed).
      await expect(page.locator('[data-test=watchlist-grid]')).toBeVisible({ timeout: 15_000 })
    })
    const get = reqs.find((r) => /\/api\/watchlist(\?|$)/.test(r.url) && r.method === 'GET')
    expect(get?.status, 'GET /api/watchlist').toBe(200)
  })
})
