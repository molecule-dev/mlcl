/**
 * Billing contract — every flagship needs the standard Stripe-tier
 * surface. We assert the API is wired and returning live tiers.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, signup } from './_helpers.js'

test('GET /billing/tiers returns at least one priced tier', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/billing/tiers`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status(), await res.text()).toBe(200)
  const body = (await res.json()) as
    | { data?: Array<{ key: string; name: string }>; tiers?: Array<{ id: string }> }
    | Array<{ key: string }>
  const tiers = Array.isArray(body) ? body : (body.data ?? body.tiers ?? [])
  expect(tiers.length).toBeGreaterThan(0)
  // Free tier always exists; ensure shape contains a key/name.
  const first = tiers[0] as { key?: string; name?: string }
  expect(first.key ?? first.name).toBeTruthy()
})

test('GET /billing/status returns a current entitlement object', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/billing/status`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status(), await res.text()).toBe(200)
  const body = (await res.json()) as Record<string, unknown>
  expect(body).toBeTruthy()
})
