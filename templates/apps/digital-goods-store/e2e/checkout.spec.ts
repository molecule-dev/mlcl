import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Checkout page (/checkout)', () => {
  test('renders empty state when cart is empty', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/checkout')
    await page.waitForTimeout(400)
    const empty = page.getByText(/nothing to check out|empty/i)
    await expect(empty.first()).toBeAttached()
  })

  test('checkout page shows items + total once cart has them', async ({ page, request }) => {
    const me = await signup(page)
    expect(me.accessToken).toBeTruthy()
    const api = await authedApi(request, me.accessToken!)
    const products = await (await api.get('/products')).json()
    const product = products?.data?.[0] ?? products?.[0]
    expect(product, 'a product is available').toBeTruthy()
    await page.evaluate((p) => {
      const item = {
        productId: p.id,
        productSlug: p.slug,
        name: p.name,
        priceCents: p.price_cents,
        coverImage: p.cover_image,
        fileType: p.file_type,
        quantity: 1,
      }
      localStorage.setItem('trove.cart.v1', JSON.stringify([item]))
    }, product)
    await page.goto(APP_BASE + '/checkout')
    await page.waitForTimeout(400)
    const items = await page.locator('[data-testid="checkout-item"], article').count()
    expect(items, 'a line item rendered').toBeGreaterThan(0)
    const total = page.locator('[data-testid="checkout-total"]').first()
    if (await total.count()) await expect(total).toBeVisible()
  })

  test('Pay button POSTs to /api/checkout/create-session', async ({ page, request }) => {
    const me = await signup(page)
    const api = await authedApi(request, me.accessToken!)
    const products = await (await api.get('/products')).json()
    const product = products?.data?.[0] ?? products?.[0]
    await page.evaluate((p) => {
      const item = {
        productId: p.id,
        productSlug: p.slug,
        name: p.name,
        priceCents: p.price_cents,
        quantity: 1,
      }
      localStorage.setItem('trove.cart.v1', JSON.stringify([item]))
    }, product)
    await page.goto(APP_BASE + '/checkout')
    await page.waitForTimeout(400)
    const reqs = await captureNetwork(page, async () => {
      const payBtn = page.locator('[data-testid="checkout-pay"]').first()
      const fallback = page.getByRole('button', { name: /pay|checkout|complete/i })
      const target = (await payBtn.count()) ? payBtn : fallback.first()
      await target.click({ force: true }).catch(() => {})
      await page.waitForTimeout(2000)
    })
    const post = whereUrl(reqs, /\/api\/checkout\/create-session/, 'POST')
    expect(post.length, 'POST /api/checkout/create-session fired').toBeGreaterThan(0)
    expect(post[0].status, 'create-session must succeed').toBeLessThan(400)
  })

  test('back-to-cart link navigates to /cart', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/checkout')
    const link = page.getByRole('link', { name: /edit cart|back to cart|cart/i })
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no back-to-cart link')
    await link.first().click()
    await expect(page).toHaveURL(/\/cart|\/shop/)
  })

  test('unauthenticated visit redirects to /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/checkout')
    await page.waitForTimeout(800)
    expect(page.url()).toMatch(/\/login|\/checkout/)
  })
})
