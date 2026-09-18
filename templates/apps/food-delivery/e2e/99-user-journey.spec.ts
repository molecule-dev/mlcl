/**
 * Kitchen-sink user journey for food-delivery.
 *
 * Drives the primary customer flow end-to-end and asserts the backend
 * invariants that prove each step actually fired:
 *
 *   1. Sign up via the UI.
 *   2. Auth recovery pages render (`/forgot-password`, `/reset-password`).
 *   3. The pricing page renders (`/pricing`).
 *   4. Browse restaurants → click a restaurant card → menu lists items
 *      hydrated from `GET /api/menu/restaurant/:id`.
 *   5. Add a menu item, hit checkout, place an order via the UI. The
 *      app navigates to `/checkout/confirmation/:id` and that page's
 *      summary fields render from `GET /api/orders/:id`.
 *   6. The delivery ETA endpoint responds for the freshly-placed
 *      order (`GET /api/delivery/:orderId/eta`).
 *   7. The post-checkout marketing page renders at `/plan-updated`.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, pickOpenRestaurant, signup, uniqueEmail } from './_helpers.js'

test.describe('end-to-end user journey', () => {
  test('signup → browse → menu → order → confirmation → ETA → plan-updated', async ({ page }) => {
    test.setTimeout(120_000)

    // 1. signup ----------------------------------------------------------
    await signup(page, uniqueEmail('fd-journey'))

    // 2. forgot-password page renders -----------------------------------
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { name: /reset.*password/i })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('#email')).toBeVisible()

    // 2b. reset-password page renders -----------------------------------
    await page.goto(APP_BASE + '/reset-password?email=foo@example.com&token=abc')
    await expect(
      page.getByRole('heading', { name: /new password|reset.*password|choose.*password/i }),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#password')).toBeVisible()

    // 3. pricing page renders all tiers ---------------------------------
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /free/i }).first()).toBeVisible({
      timeout: 10_000,
    })

    // 4. restaurants list → menu page -----------------------------------
    // POST /orders 400s a closed restaurant, so drive one the catalog says is
    // open right now — naming the demo catalog's 24-hour row made this spec
    // pass by day and fail at night once already.
    const open = await pickOpenRestaurant(page)
    await page.goto(APP_BASE + '/restaurants')
    const firstCard = page.getByRole('heading', { name: open.name }).first()
    await expect(firstCard).toBeVisible({ timeout: 10_000 })

    const menuFetch = page.waitForResponse(
      (r) => /\/api\/menu\/restaurant\//.test(r.url()) && r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await firstCard.click()
    const menuResp = await menuFetch
    expect(menuResp.status()).toBe(200)
    const menuBody = await menuResp.json()
    const menuItems = menuBody?.data?.items ?? menuBody?.data ?? []
    expect(menuItems.length).toBeGreaterThan(0)
    await expect(page).toHaveURL(/\/restaurant\/[0-9a-f-]+/)

    // 5. add → checkout → place order -----------------------------------
    const firstItem = page.getByTestId('menu-item').first()
    await expect(firstItem).toBeVisible()
    const addBtn = firstItem.getByRole('button', { name: /^Add$/ })
    // Bump quantity so cart total clears the per-restaurant minimum.
    for (let i = 0; i < 5; i++) await addBtn.click()
    await expect(page.getByRole('heading', { name: /Your cart \(\d+\)/ })).toBeVisible()

    await page.getByTestId('cart-checkout').click()
    await expect(page).toHaveURL(/\/checkout/)

    // Fresh signup may have a seeded "Home" address; if not, fill the
    // inline new-address form. Either path leads to the same submit.
    const streetInput = page.locator('input[name="street"]')
    if ((await streetInput.count()) > 0 && (await streetInput.isVisible())) {
      await streetInput.fill('1 Spec Lane')
      await page.locator('input[name="city"]').fill('Testville')
      await page.locator('input[name="zip"]').fill('12345')
    }

    // Placing the order goes through POST /api/addresses (which makes a
    // best-effort Google Geocoding round-trip, ~5s when REQUEST_DENIED)
    // before firing POST /api/orders. 30s was too tight under load —
    // bump to 60s so a slow geocode error doesn't time the test out.
    const orderRespPromise = page.waitForResponse(
      (r) => /\/api\/orders(\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 60_000 },
    )
    await page.getByTestId('checkout-submit').click()
    const placedResp = await orderRespPromise
    expect(placedResp.status()).toBeLessThan(300)
    const placedBody = await placedResp.json()
    const orderId = placedBody?.data?.id ?? placedBody?.id
    expect(orderId, 'order POST returned an id').toBeTruthy()

    // App navigates to /checkout/confirmation/:id
    await page.waitForURL(/\/checkout\/confirmation\/[0-9a-f-]+/, { timeout: 15_000 })
    await expect(page.getByText(/order.*placed|order placed/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('confirm-total')).toBeVisible()

    // 6. delivery ETA endpoint exposed for the placed order ------------
    const etaResp = await page.request.get(`${API_BASE}/delivery/${orderId}/eta`)
    expect(etaResp.status()).toBe(200)
    const etaBody = await etaResp.json()
    expect(typeof etaBody.etaMinutes).toBe('number')
    expect(etaBody.etaMinutes).toBeGreaterThanOrEqual(0)

    // 7. post-checkout marketing page renders ---------------------------
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('link', { name: /home|return/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
