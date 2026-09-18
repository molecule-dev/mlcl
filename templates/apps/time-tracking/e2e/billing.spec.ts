import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, signup } from './_helpers.js'

test.describe('billing — tiers, status, real Stripe Checkout, cancel, webhook', () => {
  test('GET /api/billing/tiers returns free + pro + team with stripe price IDs', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    // `@molecule/api-bonds-default-express` createBillingRouter returns
    // `{ data: PricingTier[] }` (the molecule resource envelope). Accept
    // either shape so the spec stays robust if the envelope is ever dropped.
    const raw = (await res.json()) as
      | Array<{ key: string; prices: Array<{ stripePriceId: string | null; period: string }> }>
      | {
          data: Array<{
            key: string
            prices: Array<{ stripePriceId: string | null; period: string }>
          }>
        }
    const body = Array.isArray(raw) ? raw : raw.data
    const keys = body.map((t) => t.key)
    expect(keys).toContain('free')
    expect(keys).toContain('pro')
    expect(keys).toContain('team')
    const pro = body.find((t) => t.key === 'pro')!
    expect(pro.prices.some((p) => !!p.stripePriceId)).toBe(true)
  })

  test("GET /api/billing/status returns the user's current plan (defaults to free)", async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { planKey: string; isFree: boolean; limits: object }
    expect(body.planKey).toBe('free')
    expect(body.isFree).toBe(true)
    expect(body.limits).toBeTruthy()
  })

  test('POST /api/billing/checkout returns a real Stripe Checkout URL for a known priceId', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const tiers = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    const tiersRaw = (await tiers.json()) as
      | Array<{ key: string; prices: Array<{ stripePriceId: string | null; period: string }> }>
      | {
          data: Array<{
            key: string
            prices: Array<{ stripePriceId: string | null; period: string }>
          }>
        }
    const tiersBody = Array.isArray(tiersRaw) ? tiersRaw : tiersRaw.data
    const pro = tiersBody.find((t) => t.key === 'pro')!
    const monthly = pro.prices.find((p) => p.period === 'month' && !!p.stripePriceId)!
    expect(monthly.stripePriceId, 'STRIPE_TIME_TRACKING_PRO_MONTHLY env required').toBeTruthy()

    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId: monthly.stripePriceId },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { checkoutUrl?: string; updated?: boolean }
    // First-time checkout returns a real Stripe Checkout URL
    expect(body.checkoutUrl, 'must include checkoutUrl').toBeTruthy()
    expect(body.checkoutUrl!).toMatch(/checkout\.stripe\.com|cs_test_/)
  })

  test('POST /api/billing/checkout rejects unknown priceId with 400', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId: 'price_bogus_does_not_exist' },
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/billing/checkout requires auth (401)', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: { 'Content-Type': 'application/json' },
      data: { priceId: 'price_anything' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/billing/cancel without active subscription returns 4xx (no 5xx)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.post(`${API_BASE}/billing/cancel`, {
      headers: apiHeaders(accessToken),
      data: {},
    })
    expect(res.status()).toBeLessThan(500)
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('Stripe webhook rejects a body with a bad signature', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/payment-notification/stripe`, {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1234567,v1=bogus',
      },
      data: { id: 'evt_bogus', type: 'invoice.paid', object: 'event' },
    })
    expect(res.status(), 'bad signature must NOT be accepted').toBeGreaterThanOrEqual(400)
    expect(res.status(), 'must NOT 5xx').toBeLessThan(500)
  })

  test('Settings → Billing tab renders status panel + Pro/Team upgrade CTAs', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-billing]').click()
    await expect(page.locator('[data-test=billing-status]')).toBeVisible({ timeout: 10000 })
    // Tier cards rendered for free + pro + team
    await expect(page.locator('[data-test=billing-tier-free]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-test=billing-tier-pro]')).toBeVisible()
    await expect(page.locator('[data-test=billing-tier-team]')).toBeVisible()
    // Pro and Team have "Choose plan" CTAs (free does not).
    await expect(page.locator('[data-test=billing-cta-pro]')).toBeVisible()
    await expect(page.locator('[data-test=billing-cta-team]')).toBeVisible()
    // Free shows "Current" badge for a fresh user.
    await expect(page.locator('[data-test=billing-tier-free]')).toContainText(/Current/i)
  })

  test('Settings → Billing → Pro CTA fires POST /api/billing/checkout returning real Stripe URL', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-billing]').click()
    await expect(page.locator('[data-test=billing-cta-pro]')).toBeVisible({ timeout: 10000 })

    // The click triggers window.location.href = checkoutUrl which navigates
    // away to checkout.stripe.com. Block the outbound navigation to that
    // host so the test page stays alive AND so the request URL itself
    // proves the UI sent us to a real Stripe Checkout session. This is a
    // navigation block — NOT a Stripe-API mock — Stripe is never called.
    let attemptedHref = ''
    await page.route('**/checkout.stripe.com/**', (route) => {
      attemptedHref = route.request().url()
      void route.abort()
    })

    const respPromise = page.waitForResponse(
      (r) => /\/api\/billing\/checkout/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15000 },
    )
    await page.locator('[data-test=billing-cta-pro]').click({ noWaitAfter: true })
    const resp = await respPromise
    expect(resp.status()).toBe(200)
    await expect.poll(() => attemptedHref, { timeout: 10000 }).toMatch(/checkout\.stripe\.com/)
  })
})
