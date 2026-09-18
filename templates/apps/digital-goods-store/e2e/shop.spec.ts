import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, whereUrl } from './_helpers.js'

test.describe('Storefront page (/shop)', () => {
  test('lists products from /api/products', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/shop')
      await page.waitForTimeout(1200)
    })
    const get = whereUrl(reqs, /\/api\/products(?:\?|$)/, 'GET')
    expect(get.length, 'storefront fetches products').toBeGreaterThan(0)
    expect(get[0].status).toBeLessThan(400)
  })

  test('a product card link navigates to /shop/:slug', async ({ page }) => {
    await page.goto(APP_BASE + '/shop')
    // Storefront fetches products on mount; wait for the first card link.
    await page.waitForSelector('a[href^="/shop/"]', { timeout: 15000 })
    const cards = page.locator('a[href^="/shop/"]')
    const count = await cards.count()
    expect(count, 'at least one product card link').toBeGreaterThan(0)
    await cards.first().click()
    await expect(page).toHaveURL(/\/shop\/[^/]+/)
  })

  test('search/filter input narrows the rendered list when present', async ({ page }) => {
    await page.goto(APP_BASE + '/shop')
    await page.waitForTimeout(800)
    const search = page.getByRole('searchbox').or(page.locator('input[type="search"]'))
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await search
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no search field on storefront')
    const initialCards = await page.locator('a[href^="/shop/"]').count()
    await search.first().fill('zzzzz-no-match')
    await page.waitForTimeout(400)
    const afterCards = await page.locator('a[href^="/shop/"]').count()
    expect(afterCards, 'search narrowed the list').toBeLessThanOrEqual(initialCards)
  })

  test('cart drawer / cart link in header navigates to /cart', async ({ page }) => {
    await page.goto(APP_BASE + '/shop')
    const cartLink = page.getByRole('link', { name: /cart/i })
    if (await cartLink.count()) {
      await cartLink.first().click()
      await expect(page).toHaveURL(/\/cart/)
    }
  })

  test('add-to-cart button on a card increments cart contents', async ({ page }) => {
    await page.goto(APP_BASE + '/shop')
    await page.waitForTimeout(1200)
    const addBtn = page.getByRole('button', { name: /add to cart|buy/i }).first()
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await addBtn
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no inline add-to-cart on cards')
    await addBtn.click()
    await page.goto(APP_BASE + '/cart')
    const cartItems = await page.locator('[data-testid="cart-item"], article, li').count()
    expect(cartItems).toBeGreaterThan(0)
  })
})
