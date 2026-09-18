import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, signup } from './_helpers.js'

test.describe('Entitlements — free-plan limits enforced', () => {
  test('Free plan: registering a 6th device returns 4xx with entitlement error', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // Free plan caps devices at 5. Create 5 — they should all succeed.
    for (let i = 0; i < 5; i++) {
      const res = await page.request.post(`${API_BASE}/devices`, {
        headers: apiHeaders(accessToken),
        data: { name: `Cap-${i + 1}`, device_type: 'sensor' },
        failOnStatusCode: false,
      })
      expect(res.status(), `device ${i + 1} create`).toBe(201)
    }
    // The 6th MUST be rejected.
    const sixth = await page.request.post(`${API_BASE}/devices`, {
      headers: apiHeaders(accessToken),
      data: { name: 'Cap-6', device_type: 'sensor' },
      failOnStatusCode: false,
    })
    expect(sixth.status(), '6th device should be entitlement-blocked').toBeGreaterThanOrEqual(400)
    const body = (await sixth.json().catch(() => ({}))) as Record<string, unknown>
    // The body should mention upgrading or limit, never silently 200.
    const text = JSON.stringify(body).toLowerCase()
    expect(
      text.includes('limit') ||
        text.includes('upgrade') ||
        text.includes('entitle') ||
        text.includes('plan'),
      `error must indicate plan limit, got: ${JSON.stringify(body)}`,
    ).toBe(true)
  })

  test('Free plan: 6th firmware version is rejected', async ({ page }) => {
    const { accessToken } = await signup(page)
    for (let i = 0; i < 5; i++) {
      const res = await page.request.post(`${API_BASE}/firmware`, {
        headers: apiHeaders(accessToken),
        data: { version: `1.0.${i}`, device_type: 'sensor' },
        failOnStatusCode: false,
      })
      expect(res.status(), `firmware ${i + 1} create`).toBe(201)
    }
    const sixth = await page.request.post(`${API_BASE}/firmware`, {
      headers: apiHeaders(accessToken),
      data: { version: '1.0.5', device_type: 'sensor' },
      failOnStatusCode: false,
    })
    expect(sixth.status(), '6th firmware should be entitlement-blocked').toBeGreaterThanOrEqual(400)
  })
})
