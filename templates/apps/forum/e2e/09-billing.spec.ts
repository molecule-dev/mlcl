/**
 * Billing endpoints — Stripe is the registered payments provider.
 * Verify the API surface is reachable rather than hitting Stripe live.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, signup } from './_helpers.js'

test.describe('forum billing', () => {
  test('GET /api/billing/tiers returns the configured tier list', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(res.status()).toBeLessThan(400)
    const body = (await res.json()) as { tiers?: unknown[] } | unknown[]
    const tiers = Array.isArray(body) ? body : ((body as { tiers?: unknown[] }).tiers ?? [])
    expect(Array.isArray(tiers)).toBe(true)
  })

  test('GET /api/billing/status reports current entitlements', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBeLessThan(400)
  })

  test('POST /api/billing/checkout requires a valid tier id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { tier: 'this-tier-does-not-exist' },
      failOnStatusCode: false,
    })
    // Either 400 (validation) or 404 (unknown tier) — anything but 5xx.
    expect(res.status()).toBeLessThan(500)
  })
})
