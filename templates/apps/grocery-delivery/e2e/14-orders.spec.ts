import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, gotoAndWait, signup, signupAndPlaceOrder } from './_helpers'

test.describe('/orders', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/orders')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('empty state offers Start shopping link', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/orders', (r) => /\/api\/orders/.test(r.url()))
    await expect(page.getByText(/no orders yet/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('link', { name: /start shopping/i }).click()
    await expect(page).toHaveURL(/\/shop/)
  })

  test('after placing an order, /orders calls GET /api/orders and shows it', async ({ page }) => {
    await signupAndPlaceOrder(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/orders')
      await page.waitForResponse(
        (r) => /\/api\/orders/.test(r.url()) && r.request().method() === 'GET',
        { timeout: 15_000 },
      )
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/orders(\?|$)/.test(r.url))
    expect(list).toBeDefined()
    expect(list!.status).toBe(200)
    await expect(page.getByText(/\d+\s*items?/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Track CTA on an active order navigates to /order/:id', async ({ page }) => {
    await signupAndPlaceOrder(page)
    await gotoAndWait(
      page,
      APP_BASE + '/orders',
      (r) => /\/api\/orders/.test(r.url()) && r.request().method() === 'GET',
    )
    const trackLink = page.getByRole('link', { name: /track/i }).first()
    await expect(trackLink).toBeVisible({ timeout: 10_000 })
    await trackLink.click()
    await expect(page).toHaveURL(/\/order\/[^/]+(\/$|$)/)
  })
})
