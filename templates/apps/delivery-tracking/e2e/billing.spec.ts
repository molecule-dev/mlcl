import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiRequest, signup, unwrap } from './_helpers.js'

test.describe('billing API (consumed by /pricing + PlanUpdated)', () => {
  test('GET /api/billing/tiers returns at least one tier', async ({ page }) => {
    await signup(page)
    const { status, body } = await apiRequest<unknown>(page, 'GET', '/api/billing/tiers')
    expect(status).toBe(200)
    const tiers = unwrap<unknown>(body)
    const len = Array.isArray(tiers)
      ? tiers.length
      : Object.keys(tiers as Record<string, unknown>).length
    expect(len).toBeGreaterThan(0)
  })

  test('GET /api/billing/status returns subscription state', async ({ page }) => {
    await signup(page)
    const { status, body } = await apiRequest<any>(page, 'GET', '/api/billing/status')
    expect(status).toBe(200)
    expect(body).toBeTruthy()
  })

  test('POST /api/billing/checkout without priceId returns a 400', async ({ page }) => {
    await signup(page)
    const { status } = await apiRequest<any>(page, 'POST', '/api/billing/checkout', {})
    expect(status).toBe(400)
  })
})
