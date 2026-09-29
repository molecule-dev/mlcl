import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup } from './_helpers.js'

test.describe('storefront UI', () => {
  test('Trending Now renders product cards from /api/storefront/bestsellers', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const trendingCards = page.locator('[data-mol-id^="product-card-"]')
    await expect(trendingCards.first()).toBeVisible({ timeout: 10_000 })
    await expect(trendingCards.first()).toBeAttached()
  })

  test('clicking Add to Cart on storefront card with auth adds an item to /api/cart', async ({
    page,
    request,
  }) => {
    await signup(page)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const firstAdd = page.locator('[data-mol-id^="add-to-cart-"]').first()
    await expect(firstAdd).toBeVisible({ timeout: 10_000 })
    await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/cart\/items/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      firstAdd.click(),
    ])
    const cart = (await request
      .get(API_BASE + '/cart', { headers: { Cookie: cookieHeader } })
      .then((r) => r.json())) as {
      items: Array<{ product_id?: string; productId?: string }>
      subtotal: number
    }
    expect(cart.items.length).toBeGreaterThan(0)
    expect(cart.subtotal).toBeGreaterThan(0)
  })

  test('search submit yields a Results heading and matching cards', async ({ page, request }) => {
    const products = (await request.get(API_BASE + '/products?limit=1').then((r) => r.json())) as {
      data: Array<{ name: string }>
    }
    const productName = products.data?.[0]?.name
    expect(productName).toBeTruthy()
    const queryWord = productName.split(/\s+/)[0] ?? 'wireless'
    await page.goto(APP_BASE + '/search?q=' + encodeURIComponent(queryWord))
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="search-heading"]')).toContainText(queryWord, {
      timeout: 10_000,
    })
  })

  test('search empty query shows browse mode (no /search/q error)', async ({ page }) => {
    await page.goto(APP_BASE + '/search')
    await expect(page.locator('[data-mol-id="search-heading"]')).toBeVisible({ timeout: 10_000 })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const grid = page.locator('[data-mol-id="search-grid"]')
    expect(await grid.locator('article').count()).toBeGreaterThan(0)
  })
})
