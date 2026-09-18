import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  captureNetwork,
  signup,
  signupAndAddToCart,
  signupAndPlaceOrder,
} from './_helpers'

// /order/:id/confirmation — OrderConfirmation. Loads /api/orders/:id.
// Shows hero "Order placed!", order ref, status timeline, items list,
// totals breakdown, and CTAs to track / continue shopping.

test.describe('/order/:id/confirmation', () => {
  test('after placing an order, the confirmation page renders order ref + total', async ({
    page,
  }) => {
    const orderId = await signupAndPlaceOrder(page)
    await expect(page).toHaveURL(new RegExp(`/order/${orderId}/confirmation`))
    await expect(page.getByRole('heading', { name: /order placed/i })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('[data-test="order-ref"]')).toBeVisible()
    await expect(page.locator('[data-test="order-total"]')).toBeVisible()
    const total = await page.locator('[data-test="order-total"]').textContent()
    expect(total).toMatch(/\$\d/)
  })

  test('order items are populated from GET /api/orders/:id', async ({ page }) => {
    // captureNetwork wraps the entire flow including the post-redirect
    // GET /api/orders/:id that OrderConfirmation fires on mount.
    await signupAndAddToCart(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/checkout')
      await page.waitForResponse((r) => /\/api\/cart/.test(r.url()), { timeout: 15_000 })
      await page.waitForResponse((r) => /\/api\/delivery-slots/.test(r.url()), { timeout: 15_000 })
      const postP = page.waitForResponse(
        (r) => /\/api\/orders/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await page.getByRole('button', { name: /place order/i }).click()
      await postP
      await page.waitForURL(/\/order\/[^/]+\/confirmation/, { timeout: 15_000 })
      await page.waitForResponse(
        (r) => /\/api\/orders\/[^/?]+($|\?)/.test(r.url()) && r.request().method() === 'GET',
        { timeout: 15_000 },
      )
    })
    const orderGet = reqs.find(
      (r) => r.method === 'GET' && /\/api\/orders\/[^/?]+($|\?)/.test(r.url),
    )
    expect(orderGet).toBeDefined()
    expect(orderGet!.status).toBe(200)
    await expect(page.locator('[data-test="order-items"] li').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('"Track order" CTA navigates to /order/:id', async ({ page }) => {
    const orderId = await signupAndPlaceOrder(page)
    await page.getByRole('link', { name: /track order/i }).click()
    await expect(page).toHaveURL(new RegExp(`/order/${orderId}(\\/$|$)`))
  })

  test('"Continue shopping" CTA navigates to /shop', async ({ page }) => {
    await signupAndPlaceOrder(page)
    await page.getByRole('link', { name: /continue shopping/i }).click()
    await expect(page).toHaveURL(/\/shop/)
  })
})

void signup
