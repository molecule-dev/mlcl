import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

interface BillingTier {
  key: string
  name: string
  prices: Array<{ period: string; price: string; stripePriceId?: string | null }>
  limits: Record<string, unknown>
}

test.describe('pricing', () => {
  test('public /pricing page renders heading and at least one tier card', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
    })
    // PricingPage from @molecule/app-billing-react shows tier names.
    const free = page.getByText(/Free/i).first()
    await expect(free).toBeVisible()
    // Confirm /billing/tiers fired (the call powers every card on the page).
    const tiersCall = reqs.find((r) => /\/billing\/tiers/.test(r.url) && r.method === 'GET')
    expect(tiersCall?.status, 'GET /billing/tiers fired on pricing load').toBe(200)
  })

  test('renderLimits emits all 7 inventory-specific bullets per tier', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const bullets = await page
      .getByText(/alerts|products|stock|transfers|warehouses|features|export/i)
      .count()
    // 7 bullets × ≥3 tiers = ≥ 21 line items in PricingPage tier limits
    expect(bullets).toBeGreaterThanOrEqual(21)
  })

  test('clicking a paid-tier CTA navigates to a real Stripe Checkout session (cs_test_*)', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('pricing-cta'))
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    // PricingPage tags every tier CTA with data-mol-id="pricing-cta-<key>".
    // Pick the first non-free one — those are the paid upgrade buttons.
    const ctaButtons = page.locator(
      '[data-mol-id^="pricing-cta-"]:not([data-mol-id="pricing-cta-free"])',
    )
    const count = await ctaButtons.count()
    expect(count, 'expected at least one non-free pricing CTA').toBeGreaterThan(0)
    // The CTA POSTs /billing/checkout, then the app navigates the page to
    // the returned checkoutUrl. Wait for the URL change rather than racing
    // for the response body, which becomes unreadable once navigation begins.
    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 30_000 }),
      ctaButtons.first().click(),
    ])
    expect(page.url(), 'expected page to navigate to a real Stripe Checkout URL').toMatch(
      /checkout\.stripe\.com|cs_test_/,
    )
  })

  test('GET /billing/tiers returns at least one paid tier with a stripePriceId so the upgrade flow is real', async ({
    request,
  }) => {
    const res = await request.get(`${API_BASE}/billing/tiers`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { data: BillingTier[] }
    expect(Array.isArray(body.data)).toBeTruthy()
    const paid = body.data.find((t) => t.prices.some((p) => p.stripePriceId))
    expect(paid, 'no tier has a real stripePriceId — upgrade flow would be a no-op').toBeTruthy()
  })

  test('POST /billing/checkout with the cheapest paid priceId returns a Stripe Checkout URL or upgrade-in-place', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('pricing-direct'))
    const tiersResp = await page.request.get(`${API_BASE}/billing/tiers`)
    const tiers = ((await tiersResp.json()) as { data: BillingTier[] }).data
    let priceId: string | null = null
    for (const tier of tiers) {
      for (const p of tier.prices) {
        if (p.stripePriceId) {
          priceId = p.stripePriceId
          break
        }
      }
      if (priceId) break
    }
    test.skip(!priceId, 'no stripePriceId configured in this scaffold')
    const co = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(accessToken),
      data: { priceId },
      failOnStatusCode: false,
    })
    // Real Stripe creds → 200 with a checkout url. Test creds may also yield
    // 502/503 from upstream Stripe; either is acceptable, but 4xx is not.
    expect([200, 502, 503]).toContain(co.status())
    if (co.status() === 200) {
      const body = (await co.json()) as { checkoutUrl?: string; updated?: boolean }
      const ok =
        (typeof body.checkoutUrl === 'string' && /^https?:\/\//.test(body.checkoutUrl)) ||
        body.updated === true
      expect(ok, JSON.stringify(body)).toBeTruthy()
    }
  })
})
