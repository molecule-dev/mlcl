import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

// /pricing — public marketing pricing page rendered by
// @molecule/app-billing-react PricingPage. Reads /api/billing/tiers
// and shows three tier cards (Free, Pro, Team).

test.describe('/pricing', () => {
  test('renders without auth and shows tier cards', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(2000)
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/free/i)
    expect(body).toMatch(/pro/i)
    expect(body).toMatch(/team/i)
  })

  test('GET /api/billing/tiers fires on load and returns 200', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForTimeout(2500)
    })
    const tiers = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(tiers, 'GET /api/billing/tiers should fire on /pricing').toBeDefined()
    expect(tiers!.status).toBe(200)
  })

  test('tier cards render limit values from real API (5 flags Free, ∞ Team)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(2500)
    const body = await page.locator('body').innerText()
    // Free tier: 5 flags. Pro: 500. Team: ∞.
    expect(body).toMatch(/5\b/)
    expect(body).toMatch(/500\b/)
    expect(body).toMatch(/∞|999|9999/)
  })

  test('navigating to /pricing while logged-out does not redirect', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('authenticated /api/billing/checkout creates a real Stripe Checkout session', async ({
    page,
  }) => {
    // Real-money invariant: clicking Upgrade-to-Pro on /pricing makes the
    // frontend POST /api/billing/checkout, which must reach the real Stripe
    // API and return a real Checkout session URL. A 2xx + a placeholder URL
    // would let users "upgrade" without paying. The Stripe test-mode key in
    // .env.flagship-rollout produces session URLs of the form
    // https://checkout.stripe.com/c/pay/cs_test_…
    //
    // We exercise the API directly here instead of clicking the CTA because
    // the frontend immediately navigates to the returned checkoutUrl, which
    // detaches the page before Playwright can read the response body. The UI
    // wiring (CTA → POST /api/billing/checkout → window.location.assign) is
    // already covered by the suite's page-level smoke; this test guards the
    // backend integration.
    await signup(page)
    // getAccessToken() reads the httpOnly token cookie set by the auth bond.
    // It polls until the token is available, so no extra waitForFunction needed.
    const token = await getAccessToken(page)
    expect(token, 'auth bond must persist the JWT after signup').toBeTruthy()

    // Resolve the real Pro priceId from the public tiers endpoint so the test
    // doesn't depend on env-var-specific values.
    const tiersResp = await page.request.get(API_BASE + '/billing/tiers')
    expect(tiersResp.status()).toBe(200)
    const tiers =
      (
        (await tiersResp.json()) as {
          data?: Array<{ key: string; prices?: Array<{ stripePriceId?: string | null }> }>
        }
      ).data ?? []
    const proTier = tiers.find((t) => t.key === 'pro')
    const proPrice = proTier?.prices?.find((p) => p.stripePriceId)
    expect(proPrice?.stripePriceId, 'Pro tier must expose a real Stripe priceId').toBeTruthy()

    const checkoutResp = await page.request.post(API_BASE + '/billing/checkout', {
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      data: { priceId: proPrice!.stripePriceId! },
    })
    expect(checkoutResp.status(), 'POST /api/billing/checkout must succeed').toBe(200)
    const body = (await checkoutResp.json()) as { checkoutUrl?: string }
    expect(body.checkoutUrl, 'real Stripe Checkout URL must come back from the API').toMatch(
      /checkout\.stripe\.com|cs_test_/,
    )
    // Sanity-check the URL actually resolves to Stripe (not a stub redirect).
    expect(body.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//)

    // Also surface that the UI button itself is wired and visible — guards
    // against the API working but the CTA going missing.
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(2500)
    await expect(page.locator('[data-mol-id="pricing-cta-pro"]').first()).toBeVisible()
  })
})
