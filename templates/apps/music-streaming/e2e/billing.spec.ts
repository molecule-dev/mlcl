/**
 * Billing — INVENTORY user flows #8 (subscription gate / Stripe checkout)
 * and #15 (subscription downgrade). Stripe lives behind the
 * `@molecule/api-payments-stripe` bond — in a verify environment without
 * test keys, the route returns 503 (provider unavailable). We assert the
 * route exists, validates input, and is gated by auth.
 *
 * G22: validation case (missing priceId) + authz case (anonymous).
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiSignup } from './_shared/auth.js'
import { resetDb, dbNameForSlug } from './_shared/db.js'

const SLUG = 'music-streaming'
const API_URL = process.env.API_URL ?? 'http://localhost:4000'

test.beforeEach(async () => {
  await resetDb(dbNameForSlug(SLUG))
})

test('happy path: GET /api/billing/tiers returns pricing tiers (anonymous-readable)', async ({
  request,
}) => {
  const res = await request.get(`${API_URL}/api/billing/tiers`, { failOnStatusCode: false })
  expect(res.ok()).toBe(true)
  const body = (await res.json()) as { data: Array<{ planKey: string }> }
  expect(Array.isArray(body.data)).toBe(true)
  expect(body.data.length).toBeGreaterThan(0)
})

test('happy path: GET /api/billing/status returns the user effective tier', async ({ request }) => {
  const { authHeaders } = await apiSignup(request, {
    email: `e2e-${Date.now()}-bs@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const res = await request.get(`${API_URL}/api/billing/status`, {
    headers: authHeaders,
    failOnStatusCode: false,
  })
  expect(res.ok()).toBe(true)
  const tier = (await res.json()) as { planKey: string; isFree: boolean }
  expect(tier.planKey).toBeTruthy()
})

test('validation failure: POST /api/billing/checkout without priceId is rejected (400)', async ({
  request,
}) => {
  const { authHeaders } = await apiSignup(request, {
    email: `e2e-${Date.now()}-bv@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const res = await request.post(`${API_URL}/api/billing/checkout`, {
    headers: authHeaders,
    data: {},
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(400)
})

test('authorization failure: anonymous /api/billing/status returns 401 (unauthorized)', async ({
  request,
}) => {
  const res = await request.get(`${API_URL}/api/billing/status`, { failOnStatusCode: false })
  expect([401, 403]).toContain(res.status())
})
