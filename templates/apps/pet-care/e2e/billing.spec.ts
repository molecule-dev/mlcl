/**
 * Billing contract — pet-care wires Stripe via @molecule/api-payments-stripe.
 * These tests assert the bond is wired AND the checkout call hits real Stripe
 * (cs_test_... session URL), not just that the route returns 2xx.
 *
 * Why this matters: a previous scaffold of pet-care shipped without
 * `setupPaymentsStripe()` in `api/src/bonds/index.ts`. The /billing/tiers
 * call still returned tiers, but /billing/checkout returned
 * `{ error: "Billing provider unavailable. Try again later." }` because
 * `get<PaymentProvider>('payments', 'stripe')` was undefined. Tests that
 * only checked GET /billing/tiers failed to catch this. This spec drives
 * the actual checkout call to prove the integration is live.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, getAccessToken, signup } from './_helpers.js'

test.describe('billing', () => {
  test('GET /billing/tiers returns at least one priced tier (free + ≥1 paid)', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const res = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status(), await res.text()).toBe(200)
    const body = (await res.json()) as { data?: Array<unknown> } | Array<unknown>
    const tiers = Array.isArray(body) ? body : (body.data ?? [])
    expect(tiers.length).toBeGreaterThanOrEqual(2)
  })

  test('GET /billing/status returns planKey for an authed user', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status(), await res.text()).toBe(200)
    const body = (await res.json()) as { planKey?: string }
    expect(body.planKey, 'planKey present').toBeTruthy()
  })

  test('POST /billing/checkout returns a real Stripe Checkout URL (cs_test_...)', async ({
    page,
  }) => {
    await signup(page)
    const token = await getAccessToken(page)
    // Pull a real Pro priceId from the tier list so this test never goes stale
    // when prices rotate.
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const tiersBody = (await tiersRes.json()) as
      | { data?: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }> }
      | Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    const tiers = Array.isArray(tiersBody) ? tiersBody : (tiersBody.data ?? [])
    const proTier = tiers.find((t) => t.key === 'pro')
    expect(proTier, 'pro tier present').toBeTruthy()
    const priceId = proTier!.prices.find((p) => p.stripePriceId)?.stripePriceId
    expect(priceId, 'pro tier has at least one stripePriceId in env').toBeTruthy()

    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { priceId },
    })
    expect(res.status(), await res.text()).toBe(200)
    const body = (await res.json()) as { checkoutUrl?: string }
    expect(body.checkoutUrl, 'checkoutUrl in response').toBeTruthy()
    expect(
      body.checkoutUrl,
      `expected real Stripe Checkout URL, got "${body.checkoutUrl}"`,
    ).toMatch(/^https:\/\/checkout\.stripe\.com\/.*cs_test_/)
  })

  test('POST /billing/checkout rejects an unknown priceId', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { priceId: 'price_definitely_not_real' },
    })
    expect(res.status()).toBe(400)
  })

  test('Stripe webhook endpoint mounted and rejects unsigned POST (no silent 200)', async ({
    request,
  }) => {
    // Real Stripe webhooks require a valid signature. An unsigned POST must
    // NOT return 200 — that would mean we auto-promote unauthenticated
    // requests to plan changes.
    const res = await request.post(`${API_BASE}/users/payment-notification/stripe`, {
      headers: { 'Content-Type': 'application/json' },
      data: { type: 'checkout.session.completed', data: { object: { id: 'cs_test_fake' } } },
    })
    expect(res.status(), 'webhook endpoint mounted').not.toBe(404)
    expect(
      [400, 401, 403, 422, 500],
      `webhook rejects unsigned payload, got ${res.status()}`,
    ).toContain(res.status())
  })
})
