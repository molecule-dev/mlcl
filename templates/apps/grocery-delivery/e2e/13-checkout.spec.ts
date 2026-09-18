import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, signupAndAddToCart } from './_helpers'

// /checkout — authenticated. Loads /api/cart + /api/delivery-slots.
// Form: address (line1, city, ZIP), delivery slot radio, tip,
// payment method radio. Submit calls POST /api/orders → navigate to
// /order/:id/confirmation.

test.describe('/checkout', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/checkout')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('empty cart shows browse-the-aisles CTA back to /shop', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/checkout')
    await page.waitForResponse((r) => /\/api\/cart/.test(r.url()), { timeout: 15_000 })
    await expect(page.getByText(/cart is empty/i)).toBeVisible({ timeout: 10_000 })
    await page
      .getByRole('button', { name: /browse the aisles|browse|shop/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/shop/)
  })

  test('place order calls POST /api/orders and navigates to /order/:id/confirmation', async ({
    page,
  }) => {
    await signupAndAddToCart(page)
    await page.goto(APP_BASE + '/checkout')
    await page.waitForResponse((r) => /\/api\/cart/.test(r.url()), { timeout: 15_000 })
    await page.waitForResponse((r) => /\/api\/delivery-slots/.test(r.url()), { timeout: 15_000 })
    const reqs = await captureNetwork(page, async () => {
      const postP = page.waitForResponse(
        (r) => /\/api\/orders/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await page.getByRole('button', { name: /place order/i }).click()
      await postP
      await page.waitForURL(/\/order\/[^/]+\/confirmation/, { timeout: 15_000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/orders/.test(r.url))
    expect(post, 'POST /api/orders should fire').toBeDefined()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(300)
  })

  test('order persists — GET /api/orders shows the new row after checkout', async ({ page }) => {
    await signupAndAddToCart(page)
    await page.goto(APP_BASE + '/checkout')
    await page.waitForResponse((r) => /\/api\/delivery-slots/.test(r.url()), { timeout: 15_000 })
    const postP = page.waitForResponse(
      (r) => /\/api\/orders/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /place order/i }).click()
    await postP
    await page.waitForURL(/\/order\/[^/]+\/confirmation/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/orders')
    // Wait for the GET to complete AND the order count text to render — the
    // GET response can resolve a tick before React commits the list, which
    // makes the immediate `getByText(/\d+ items/i).count()` flake.
    await expect(page.getByText(/\d+\s*items?/i).first()).toBeVisible({ timeout: 15_000 })
    const itemsHeader = await page.getByText(/\d+\s*items?/i).count()
    expect(itemsHeader).toBeGreaterThanOrEqual(1)
  })

  test('selecting a different tip updates the displayed total', async ({ page }) => {
    await signupAndAddToCart(page)
    await page.goto(APP_BASE + '/checkout')
    await page.waitForResponse((r) => /\/api\/cart/.test(r.url()), { timeout: 15_000 })
    const totalBefore = await page.locator('[data-test="checkout-total"]').textContent()
    await page
      .getByRole('button', { name: /^\$5$|^5$/ })
      .first()
      .click()
    await page.waitForTimeout(200)
    const totalAfter = await page.locator('[data-test="checkout-total"]').textContent()
    expect(totalBefore).not.toBe(totalAfter)
  })

  test('payment method radio toggles between card / apple_pay / google_pay', async ({ page }) => {
    await signupAndAddToCart(page)
    await page.goto(APP_BASE + '/checkout')
    await page.waitForResponse((r) => /\/api\/cart/.test(r.url()), { timeout: 15_000 })
    const apple = page.locator('input[type="radio"][name="paymentMethod"][value="apple_pay"]')
    await apple.check({ force: true })
    await expect(apple).toBeChecked()
  })

  test('editing the address line persists into the order body', async ({ page }) => {
    await signupAndAddToCart(page)
    await page.goto(APP_BASE + '/checkout')
    await page.waitForResponse((r) => /\/api\/cart/.test(r.url()), { timeout: 15_000 })
    const street = page.getByRole('textbox', { name: /street address/i })
    await street.fill('900 Custom Lane')
    let captured: Record<string, unknown> | null = null
    page.on('request', (req) => {
      if (req.method() === 'POST' && /\/api\/orders/.test(req.url())) {
        try {
          captured = JSON.parse(req.postData() || '{}')
        } catch {
          /* ignore */
        }
      }
    })
    const postP = page.waitForResponse(
      (r) => /\/api\/orders/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /place order/i }).click()
    await postP
    await page.waitForURL(/\/order\/[^/]+\/confirmation/, { timeout: 15_000 })
    expect(captured).toBeTruthy()
    expect(JSON.stringify(captured!)).toContain('900 Custom Lane')
  })
})
