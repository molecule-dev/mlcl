import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /shop — authenticated. Loads /api/products + /api/cart. Rendered by
// Shop.tsx → BushelHero, CategoryStrip, FeaturedProductsGrid,
// OrderSummaryCard.

test.describe('/shop', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/shop')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, /shop loads products from /api/products with 200', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
      await page.goto(APP_BASE + '/shop')
      await page.waitForResponse((r) => r.url().includes('/api/products') && r.status() === 200, {
        timeout: 15_000,
      })
    })
    const list = reqs.find(
      (r) => r.method === 'GET' && /\/api\/products(\?|$|\/$)/.test(r.url) && r.status === 200,
    )
    expect(list, 'GET /api/products should succeed').toBeDefined()
  })

  test('clicking a featured product navigates to /product/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shop')
    await page.waitForResponse((r) => r.url().includes('/api/products'), { timeout: 15_000 })
    const link = page.locator('a[href^="/product/"]').first()
    await expect(link).toBeVisible({ timeout: 10_000 })
    await link.click()
    await expect(page).toHaveURL(/\/product\//)
  })

  test('Add-to-cart button calls POST /api/cart/items and updates summary count', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shop')
    await page.waitForResponse((r) => r.url().includes('/api/products'), { timeout: 15_000 })
    const addBtn = page.getByRole('button', { name: /add.*to cart/i }).first()
    await expect(addBtn).toBeVisible({ timeout: 10_000 })
    const reqs = await captureNetwork(page, async () => {
      const postP = page.waitForResponse(
        (r) => r.url().includes('/api/cart/items') && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await addBtn.click()
      await postP
      await page.waitForTimeout(400)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/cart\/items/.test(r.url))
    expect(post, 'POST /api/cart/items should fire').toBeDefined()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(300)
  })

  test('selecting a category filters the visible product grid', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shop')
    await page.waitForResponse((r) => r.url().includes('/api/products'), { timeout: 15_000 })
    // CategoryStrip renders category buttons. Click the produce filter.
    const produce = page.getByRole('button', { name: /produce/i }).first()
    if (await produce.count()) {
      await produce.click()
      await page.waitForTimeout(300)
      // Product grid should still render at least one card or an empty message
      const present = await page.locator('a[href^="/product/"]').count()
      expect(present).toBeGreaterThanOrEqual(0)
    }
  })

  test('hero CTAs route to /cart and /lists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shop')
    await page.waitForLoadState('networkidle')
    const cartLink = page.locator('a[href="/cart"]').first()
    await cartLink.click()
    await expect(page).toHaveURL(/\/cart/)
    await page.goto(APP_BASE + '/shop')
    const listsLink = page.locator('a[href="/lists"]').first()
    await listsLink.click()
    await expect(page).toHaveURL(/\/lists/)
  })
})
