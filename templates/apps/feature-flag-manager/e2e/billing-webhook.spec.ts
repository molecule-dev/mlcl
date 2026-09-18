import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE } from './_helpers.js'

test.describe('Stripe webhook endpoint', () => {
  test('payment-notification endpoint exists and rejects unsigned/invalid POSTs (no silent 200)', async ({
    request,
  }) => {
    // Real Stripe webhooks require a valid signature. An unsigned POST must
    // NOT return 200 — that would imply we're auto-promoting unauthenticated
    // requests to plan changes. Acceptable: 400, 401, 403, 422, 500.
    const res = await request.post(`${API_BASE}/users/payment-notification/stripe`, {
      data: { type: 'checkout.session.completed', data: { object: { id: 'cs_test_fake' } } },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status(), 'webhook endpoint mounted').not.toBe(404)
    expect(
      [400, 401, 403, 422, 500],
      `webhook rejects unsigned payload, got ${res.status()}`,
    ).toContain(res.status())
  })
})
