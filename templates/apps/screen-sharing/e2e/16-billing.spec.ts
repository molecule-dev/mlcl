import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('billing /billing', () => {
  test('page loads with the current plan', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/free/i).first()).toBeVisible()
  })

  test('captureNetwork sees /api/billing/status + /api/billing/tiers', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/billing')
      await page.waitForLoadState('networkidle')
    })
    const status = reqs.find((r) => /\/api\/billing\/status/.test(r.url) && r.method === 'GET')
    const tiers = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
    expect(status?.status).toBe(200)
    expect(tiers?.status).toBe(200)
  })

  test('GET /api/billing/status returns the free tier for new users', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      planKey: string
      isFree: boolean
      limits: { maxRecordings: number }
    }
    expect(body.planKey).toBe('free')
    expect(body.isFree).toBe(true)
    expect(body.limits.maxRecordings).toBeGreaterThan(0)
  })

  test('cancel without an active subscription returns 4xx, not a crash', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.post(`${API_BASE}/billing/cancel`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('tiers list contains real Stripe priceIds for Pro/Team', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/billing/tiers`)
    const body = (await res.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const pro = body.data.find((t) => t.key === 'pro')
    expect(
      pro?.prices.some((p) => typeof p.stripePriceId === 'string' && p.stripePriceId.length > 0),
    ).toBe(true)
  })

  test('checkout requires a valid Stripe priceId', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(accessToken),
      data: { priceId: 'price_does_not_exist' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(400)
  })
})
