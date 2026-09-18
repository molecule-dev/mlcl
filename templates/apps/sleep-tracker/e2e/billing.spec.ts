/**
 * Billing / Stripe contract.
 *
 * - GET /billing/tiers returns the registered tier list with prices
 * - GET /billing/status returns the user's plan
 * - POST /billing/checkout returns a real Stripe Checkout session URL
 *   (cs_test_… or checkout.stripe.com) — NOT a stub redirect
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, signup } from './_helpers.js'

test('GET /billing/tiers returns the registered tier catalog', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/billing/tiers`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as { data?: unknown[]; tiers?: unknown[] } | unknown[]
  const tiers = Array.isArray(body)
    ? body
    : ((body as { data?: unknown[] }).data ?? (body as { tiers?: unknown[] }).tiers ?? [])
  expect(Array.isArray(tiers) ? tiers.length : 0).toBeGreaterThan(0)
  // Must include the free tier and at least one paid tier
  const keys = (tiers as { key?: string }[]).map((t) => t.key ?? '')
  expect(keys).toContain('free')
  expect(keys.some((k) => k === 'pro' || k === 'team')).toBe(true)
})

test("GET /billing/status returns the current user's plan", async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/billing/status`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
})

test('POST /billing/checkout returns a real Stripe Checkout URL', async ({ page }) => {
  const { accessToken } = await signup(page)

  // Pull the tier catalog so we can pick a paid tier
  const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
    headers: apiHeaders(accessToken),
  })
  expect(tiersRes.status()).toBe(200)
  const body = (await tiersRes.json()) as { data?: unknown[]; tiers?: unknown[] } | unknown[]
  const tiers = (
    Array.isArray(body)
      ? body
      : ((body as { data?: unknown[] }).data ?? (body as { tiers?: unknown[] }).tiers ?? [])
  ) as {
    key?: string
    prices?: { period?: string; stripePriceId?: string | null }[]
  }[]
  const paid = tiers.find((t) => (t.key ?? '') !== 'free') ?? tiers[1] ?? tiers[0]
  expect(paid, 'no paid tier found in /billing/tiers payload').toBeTruthy()
  const monthly = paid!.prices?.find((p) => p.period === 'month' && p.stripePriceId)
  expect(monthly, 'no monthly Stripe priceId found on the paid tier').toBeTruthy()

  const res = await page.request.post(`${API_BASE}/billing/checkout`, {
    headers: apiHeaders(accessToken),
    data: { priceId: monthly!.stripePriceId },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  const json = (await res.json()) as { checkoutUrl?: string }
  expect(json.checkoutUrl, JSON.stringify(json)).toMatch(/checkout\.stripe\.com|cs_test_/)
})
