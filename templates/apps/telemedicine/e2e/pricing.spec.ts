import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/pricing — Pricing & Stripe checkout', () => {
  test('renders the three Solace tiers with their limits', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /choose your solace plan/i })).toBeVisible()
    await expect(page.getByText(/^Free$/)).toBeVisible()
    await expect(page.getByText(/^Pro$/).first()).toBeVisible()
    await expect(page.getByText(/^Team$/)).toBeVisible()
    await expect(page.locator('body')).toContainText(/appointments/i)
    await expect(page.locator('body')).toContainText(/prescriptions/i)
    await expect(page.locator('body')).toContainText(/records/i)
    await expect(page.locator('body')).toContainText(/advanced features/i)
  })

  test('Authed user sees "Current plan" on Free + actionable upgrade buttons on paid tiers', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(page.getByText(/current plan/i)).toBeVisible({ timeout: 15000 })
    })
    // PricingPage drives the tier cards from a single backend call.
    const tiers = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers(\?|$)/.test(r.url))
    expect(tiers, 'authed pricing must GET /api/billing/tiers').toBeTruthy()
    expect(tiers!.status).toBeLessThan(400)
    await expect(page.getByRole('button', { name: /upgrade.*pro/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /upgrade.*team/i })).toBeVisible()
  })

  test('Clicking "Upgrade to Pro" creates a real Stripe Checkout session and redirects', async ({
    page,
  }) => {
    // Verify three independent invariants (no upstream mocks, no
    // `route.fulfill` — real backend hits real Stripe):
    //   (a) Clicking the upgrade button POSTs to /api/billing/checkout
    //       with a real Stripe priceId in the body.
    //   (b) Hitting that same endpoint server-side returns a real
    //       cs_test_* Stripe checkout URL (verified via page.request,
    //       which doesn't trigger a browser navigation).
    //   (c) The page actually attempts to redirect to the returned
    //       Stripe URL — captured via `page.on('request')` of the
    //       navigation request, then aborted with `route.abort()` so
    //       the test session doesn't actually leave the app.
    let navTarget: string | null = null
    page.on('request', (r) => {
      if (r.isNavigationRequest() && r.url().includes('checkout.stripe.com')) {
        navTarget = r.url()
      }
    })
    await page.route('**checkout.stripe.com/**', (route) => route.abort('aborted'))

    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const reqPromise = page.waitForRequest(
      (r) => r.url().includes('/api/billing/checkout') && r.method() === 'POST',
      { timeout: 15000 },
    )
    await page.getByRole('button', { name: /upgrade.*pro/i }).click()
    const req = await reqPromise
    const reqBody = req.postDataJSON() as { priceId?: string }
    expect(reqBody.priceId, 'click must include a Stripe priceId').toMatch(/^price_/)

    const apiResponse = await page.request.post(`${APP_BASE}/api/billing/checkout`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      data: { priceId: reqBody.priceId },
    })
    expect(apiResponse.status(), 'real /api/billing/checkout must succeed').toBeLessThan(400)
    const body = (await apiResponse.json()) as { checkoutUrl?: string }
    expect(body.checkoutUrl, 'real Stripe Checkout session URL must be returned').toMatch(
      /https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/,
    )

    await expect
      .poll(() => navTarget, { timeout: 15000 })
      .toMatch(/checkout\.stripe\.com.*cs_test_/)
  })

  test('Clicking "Upgrade to Team" also creates a real Stripe Checkout session', async ({
    page,
  }) => {
    let navTarget: string | null = null
    page.on('request', (r) => {
      if (r.isNavigationRequest() && r.url().includes('checkout.stripe.com')) {
        navTarget = r.url()
      }
    })
    await page.route('**checkout.stripe.com/**', (route) => route.abort('aborted'))

    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const reqPromise = page.waitForRequest(
      (r) => r.url().includes('/api/billing/checkout') && r.method() === 'POST',
      { timeout: 15000 },
    )
    await page.getByRole('button', { name: /upgrade.*team/i }).click()
    const req = await reqPromise
    const reqBody = req.postDataJSON() as { priceId?: string }
    expect(reqBody.priceId).toMatch(/^price_/)

    const apiResponse = await page.request.post(`${APP_BASE}/api/billing/checkout`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      data: { priceId: reqBody.priceId },
    })
    expect(apiResponse.status()).toBeLessThan(400)
    const body = (await apiResponse.json()) as { checkoutUrl?: string }
    expect(body.checkoutUrl).toMatch(/checkout\.stripe\.com.*cs_test_/)

    await expect
      .poll(() => navTarget, { timeout: 15000 })
      .toMatch(/checkout\.stripe\.com.*cs_test_/)
  })
})
