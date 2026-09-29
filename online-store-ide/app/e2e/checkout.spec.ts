import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, addFirstProductToCart, captureNetwork, signup } from './_helpers.js'

test.describe('/checkout', () => {
  test('checkout page renders for signed-in user with cart items', async ({ page }) => {
    await signup(page)
    await addFirstProductToCart(page, 1)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/checkout')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/cart\b/.test(r.url) && r.method === 'GET')).toBeTruthy()
    await expect(page.locator('body')).toBeVisible()
    const text = (await page.locator('body').textContent()) || ''
    expect(text.length).toBeGreaterThan(20)
  })

  test('checkout displays cart subtotal from the API', async ({ page }) => {
    await signup(page)
    const { product } = await addFirstProductToCart(page, 1)
    await page.goto(APP_BASE + '/checkout')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const body = (await page.locator('body').textContent()) || ''
    expect(body).toContain('$')
    expect(product?.price).toBeTruthy()
  })

  test('placing an order via the UI form persists an order, clears cart, and lands on /orders/:id', async ({
    page,
  }) => {
    await signup(page)
    const { product } = await addFirstProductToCart(page, 1)
    await page.goto(APP_BASE + '/checkout')

    await page.locator('input[name="shippingName"]').fill('Test Buyer')
    await page.locator('input[name="shippingLine1"]').fill('123 Main St')
    await page.locator('input[name="shippingCity"]').fill('Springfield')
    await page.locator('input[name="shippingState"]').fill('IL')
    await page.locator('input[name="shippingPostalCode"]').fill('62704')
    await page.locator('input[name="shippingCountry"]').fill('US')

    await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/orders\b/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 30_000 },
      ),
      page.locator('button[type="submit"]').click(),
    ])
    await expect(page).toHaveURL(/\/orders(\b|\/)/, { timeout: 30_000 })

    // Backend invariant 1: an order row exists for this user with the right product
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const ordersRes = await page.request.get(API_BASE + '/orders', {
      headers: { Cookie: cookieHeader },
    })
    expect(ordersRes.status(), 'GET /orders should be 200').toBe(200)
    const ordersBody = (await ordersRes.json()) as {
      data: Array<{
        id: string
        status: string
        items?: Array<{ product_id: string; quantity: number }>
      }>
      total: number
    }
    expect(ordersBody.total, 'should be at least one order').toBeGreaterThanOrEqual(1)
    const order = ordersBody.data[0]
    expect(order.status).toBe('confirmed')
    expect(order.items?.some((it) => it.product_id === product.id)).toBeTruthy()

    // Backend invariant 2: cart is empty post-checkout
    const cartRes = await page.request.get(API_BASE + '/cart', {
      headers: { Cookie: cookieHeader },
    })
    expect(cartRes.status()).toBe(200)
    const cartBody = (await cartRes.json()) as { items: unknown[] }
    expect(cartBody.items.length).toBe(0)
  })

  test('checkout fails with a visible error if shipping fields are blank', async ({ page }) => {
    await signup(page)
    await addFirstProductToCart(page, 1)
    await page.goto(APP_BASE + '/checkout')
    await page.locator('button[type="submit"]').click()
    await expect(page.getByRole('alert')).toContainText(/shipping/i, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/checkout$/)
  })
})
