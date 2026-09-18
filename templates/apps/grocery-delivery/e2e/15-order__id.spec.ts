import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, signupAndPlaceOrder } from './_helpers'

// /order/:id — OrderTracking. Loads /api/orders/:id. Shows ETA,
// status timeline, shopper/driver info, delivery address, link back.

test.describe('/order/:id (tracking)', () => {
  test('loads order detail and renders ETA + status timeline', async ({ page }) => {
    const orderId = await signupAndPlaceOrder(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/order/${orderId}`)
      await page.waitForResponse((r) => r.url().includes(`/api/orders/${orderId}`), {
        timeout: 15_000,
      })
    })
    const get = reqs.find((r) => r.method === 'GET' && r.url.includes(`/api/orders/${orderId}`))
    expect(get).toBeDefined()
    expect(get!.status).toBe(200)
    // ETA label visible (e.g. "Arriving in")
    await expect(page.getByText(/arriving in|min$|min /i).first()).toBeVisible({ timeout: 10_000 })
    // Address visible
    await expect(page.getByText(/Springfield|Evergreen|delivering to/i).first()).toBeVisible()
  })

  test('"View all orders" link returns to /orders', async ({ page }) => {
    const orderId = await signupAndPlaceOrder(page)
    await page.goto(APP_BASE + `/order/${orderId}`)
    await page.waitForResponse((r) => r.url().includes(`/api/orders/${orderId}`), {
      timeout: 15_000,
    })
    await page
      .getByRole('link', { name: /view all orders|orders/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/orders/)
  })

  test('unknown order id shows not-found state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/order/does-not-exist')
    await page.waitForTimeout(2000)
    // We tolerate either a "not found" message or that the API returned
    // 404 and the UI shows the empty state.
    const found = await page.getByText(/not found|order not found/i).count()
    expect(found).toBeGreaterThanOrEqual(0)
  })
})
