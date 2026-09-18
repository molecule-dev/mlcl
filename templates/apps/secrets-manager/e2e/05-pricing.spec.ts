import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

// /pricing — public marketing pricing page rendered by
// @molecule/app-billing-react PricingPage. Reads /api/billing/tiers
// and shows three tier cards (Free, Pro, Team).

test.describe('/pricing', () => {
  test('renders without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('GET /api/billing/tiers fires on load and returns 200', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForTimeout(2000)
    })
    const tiers = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(tiers, 'GET /api/billing/tiers should fire on /pricing').toBeDefined()
    expect(tiers!.status).toBe(200)
  })

  test('tier cards render Free / Pro / Team labels and limit numbers', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(2500)
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/free/i)
    expect(body).toMatch(/pro/i)
    expect(body).toMatch(/team/i)
    expect(body).toMatch(/\b5\b/) // free tier limit
    expect(body).toMatch(/\b500\b/) // pro tier limit
    expect(body).toMatch(/∞|999|9999/) // team tier "unlimited"
  })

  test('authenticated POST /api/billing/checkout returns a real Stripe Checkout URL', async ({
    page,
  }) => {
    // Real-money invariant: clicking Upgrade-to-Pro must reach Stripe and
    // return a real Checkout session URL. A 2xx + a placeholder URL would
    // let users "upgrade" without paying. The Stripe test-mode key in
    // .env.flagship-rollout produces session URLs of the form
    // https://checkout.stripe.com/c/pay/cs_test_…
    await signup(page)
    const token = await getAccessToken(page)
    expect(token, 'auth bond must persist a JWT after signup').toBeTruthy()

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
      /^https:\/\/checkout\.stripe\.com\//,
    )
  })
})
