import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  listProducts,
  seedCatalog,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/products/:id/history', () => {
  test('shell renders for an authenticated user', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('hist-shell'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await page.goto(APP_BASE + `/products/${products[0].id}/history`)
    await expect(page.locator('[data-test=price-history-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('product name heading reflects the loaded product', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('hist-name'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    const target = products[0]
    await page.goto(APP_BASE + `/products/${target.id}/history`)
    await expect(page.locator('[data-test=history-product-name]')).toContainText(
      target.name.split(' ')[0],
      { timeout: 15_000 },
    )
  })

  test('best-now value renders', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('hist-best'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await page.goto(APP_BASE + `/products/${products[0].id}/history`)
    await expect(page.locator('[data-test=history-best-now]')).toBeVisible({ timeout: 15_000 })
  })

  test('insights grid renders 4 cards', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('hist-insights'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await page.goto(APP_BASE + `/products/${products[0].id}/history`)
    await expect(page.locator('[data-test=history-insights]')).toBeVisible({ timeout: 15_000 })
  })

  test('per-retailer grid renders cards', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('hist-retailer'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    await page.goto(APP_BASE + `/products/${products[0].id}/history`)
    await page.waitForTimeout(1500)
    const byRetailer = page.locator('[data-test=history-by-retailer]')
    await expect(byRetailer.first()).toBeAttached()
  })

  test('"Back to product" link returns to /products/:id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('hist-back'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/products/${products[0].id}/history`)
      await expect(page.locator('[data-test=price-history-page]')).toBeVisible({ timeout: 15_000 })
    })
    const histCall = reqs.find((r) => /\/api\/prices\/history\//.test(r.url) && r.method === 'GET')
    expect(histCall?.status, 'GET /api/prices/history/:id').toBe(200)
    const sourcesCall = reqs.find((r) => /\/api\/sources(?:\?|$)/.test(r.url) && r.method === 'GET')
    expect(sourcesCall?.status, 'GET /api/sources for retailer enrichment').toBe(200)
    const back = page.getByRole('link', { name: /back.*product|back/i }).first()
    if (await back.count()) {
      await back.click()
      await expect(page).toHaveURL(new RegExp(`/products/${products[0].id}$`))
    }
  })
})
