import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedCatalog, signup, uniqueEmail } from './_helpers.js'

test.describe('/categories', () => {
  test('shell renders for authenticated user', async ({ page }) => {
    await signup(page, uniqueEmail('cat-shell'))
    await page.goto(APP_BASE + '/categories')
    await expect(page.locator('[data-test=categories-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('grid populates from /api/products/meta/categories after seed', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('cat-grid'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/categories')
    await expect(page.locator('[data-test=categories-grid]')).toBeVisible({ timeout: 15_000 })
    const tiles = page.locator('[data-test=categories-grid] a')
    await expect(tiles.nth(2)).toBeAttached()
  })

  test('clicking a category tile navigates to /search with category filter', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('cat-link'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/categories')
    await expect(page.locator('[data-test=categories-grid]')).toBeVisible({ timeout: 15_000 })
    const link = page.locator('[data-test=categories-grid] a').first()
    const href = await link.getAttribute('href')
    expect(href).toMatch(/\/search/)
    await link.click()
    await expect(page).toHaveURL(/\/search/)
  })

  test('initial render fires GET /api/products/meta/categories', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('cat-net'))
    await seedCatalog(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/categories')
      await expect(page.locator('[data-test=categories-page]')).toBeVisible({ timeout: 15_000 })
      await expect(page.locator('[data-test=categories-grid]')).toBeVisible({ timeout: 15_000 })
    })
    const call = reqs.find(
      (r) => /\/api\/products\/meta\/categories/.test(r.url) && r.method === 'GET',
    )
    expect(call?.status, 'GET /api/products/meta/categories').toBe(200)
  })
})
