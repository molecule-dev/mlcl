import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, signup } from './_helpers.js'

test.describe('billing — Stripe + entitlements', () => {
  test('GET /api/billing/tiers returns the configured pricing ladder (public)', async ({
    page,
  }) => {
    const res = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      data?: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    expect(Array.isArray(body.data)).toBe(true)
    const keys = (body.data ?? []).map((t) => t.key)
    expect(keys).toEqual(expect.arrayContaining(['free', 'pro']))
    const proTier = body.data?.find((t) => t.key === 'pro')
    expect(
      proTier?.prices?.length,
      'pro tier should expose at least one Stripe price',
    ).toBeGreaterThan(0)
    const proPrice = proTier?.prices?.find((p) => p.stripePriceId)
    expect(proPrice?.stripePriceId, 'pro plan must have a real Stripe priceId').toMatch(/^price_/)
  })

  test("GET /api/billing/status returns the user's current plan when authenticated", async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      planKey?: string
      name?: string
      isFree?: boolean
      limits?: Record<string, unknown>
    }
    expect(body.planKey).toBe('free')
    expect(body.isFree).toBe(true)
    expect(body.limits).toBeTruthy()
  })

  test('POST /api/billing/checkout returns a real Stripe Checkout URL', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Look up a real Pro priceId from /tiers, so this stays in sync if pricing rotates.
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(tiersRes.status()).toBe(200)
    const tiers = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const pro = tiers.data.find((t) => t.key === 'pro')
    const priceId = pro?.prices.find((p) => p.stripePriceId)?.stripePriceId
    expect(priceId, 'expected at least one Stripe priceId for the Pro tier').toBeTruthy()

    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId },
      failOnStatusCode: false,
    })
    expect(res.status(), await res.text()).toBe(200)
    const body = (await res.json()) as { checkoutUrl?: string }
    // Real Stripe Checkout URL: https://checkout.stripe.com/c/pay/cs_test_...
    expect(body.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//)
    expect(body.checkoutUrl).toMatch(/cs_test_/)
  })

  test('POST /api/billing/checkout rejects an unknown priceId with 400', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId: 'price_does_not_exist_in_registry' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/users/payment-notification/stripe rejects an unsigned/invalid webhook with 400', async ({
    page,
  }) => {
    const res = await page.request.post(`${API_BASE}/users/payment-notification/stripe`, {
      headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 't=1,v1=bogus' },
      data: { id: 'evt_invalid', type: 'checkout.session.completed' },
      failOnStatusCode: false,
    })
    // Either 400 (signature rejected) or 401 (not authed) — but never 200.
    expect([400, 401]).toContain(res.status())
  })
})
