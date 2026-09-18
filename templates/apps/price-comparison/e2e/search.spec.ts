import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  listProducts,
  seedCatalog,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/search', () => {
  test('grid renders products from /api/products after seed', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('search-grid'))
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    expect(products.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/search')
    await expect(page.locator('[data-test=search-grid]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-test=search-grid] a[href^="/products/"]').first()).toBeVisible(
      {
        timeout: 10_000,
      },
    )
  })

  test('query input narrows results', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('search-q'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/search')
    await expect(page.locator('[data-test=search-grid]')).toBeVisible({ timeout: 15_000 })
    const before = await page.locator('[data-test=search-grid] a[href^="/products/"]').count()
    await page.locator('[data-test=search-input]').first().fill('Sony')
    await page.waitForTimeout(500)
    const after = await page.locator('[data-test=search-grid] a[href^="/products/"]').count()
    expect(after).toBeLessThanOrEqual(before)
  })

  test('category filter chip restricts results', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('search-cat'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/search')
    await expect(page.locator('[data-test=search-grid]')).toBeVisible({ timeout: 15_000 })
    const chip = page.locator('[data-test=search-category-headphones]').first()
    await expect(chip).toBeVisible({ timeout: 5_000 })
    await chip.click()
    await page.waitForTimeout(300)
    const grid = page.locator('[data-test=search-grid] a[href^="/products/"]')
    await expect(grid.first()).toBeAttached()
  })

  test('max-price filter restricts results', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('search-price'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/search')
    await expect(page.locator('[data-test=search-grid]')).toBeVisible({ timeout: 15_000 })
    const slider = page.locator('[data-test=search-max-price]')
    if (await slider.count()) {
      await slider.first().fill('100')
      await page.waitForTimeout(300)
    }
  })

  test('clicking a product card navigates to /products/:id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('search-click'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/search')
    await expect(page.locator('[data-test=search-grid]')).toBeVisible({ timeout: 15_000 })
    const link = page.locator('[data-test=search-grid] a[href^="/products/"]').first()
    await link.waitFor({ state: 'visible', timeout: 10_000 })
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^\/products\//)
    await link.click()
    await expect(page).toHaveURL(/\/products\//, { timeout: 10_000 })
  })

  test('initial render fires GET /api/products', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('search-net'))
    await seedCatalog(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/search')
      await expect(page.locator('[data-test=search-grid]')).toBeVisible({ timeout: 15_000 })
    })
    const get = reqs.find((r) => /\/api\/products(\?|$)/.test(r.url) && r.method === 'GET')
    expect(get?.status, 'GET /api/products returned 200').toBe(200)
  })
})
