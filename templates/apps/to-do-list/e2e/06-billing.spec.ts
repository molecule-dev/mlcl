import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, captureNetwork, API_BASE, cookieHeader } from './_helpers.js'

test.describe('billing', () => {
  test('GET /api/billing/tiers exposes free + pro + team plans', async ({ page }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const r = await page.request.get(`${API_BASE}/billing/tiers`, { headers: { Cookie: cookie } })
    expect(r.status()).toBe(200)
    const body = await r.json()
    const tiers = Array.isArray(body) ? body : (body?.tiers ?? body?.data)
    expect(Array.isArray(tiers)).toBe(true)
    const keys = tiers.map((tier: { key?: string }) => tier.key)
    expect(keys).toContain('free')
    expect(keys).toContain('pro')
    expect(keys).toContain('team')
  })

  test('GET /api/billing/status reports planKey=free on a fresh signup', async ({ page }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const r = await page.request.get(`${API_BASE}/billing/status`, { headers: { Cookie: cookie } })
    expect(r.status()).toBe(200)
    const body = await r.json()
    expect(body.planKey).toBe('free')
    expect(body.isFree).toBe(true)
  })

  test('POST /api/billing/checkout returns a real Stripe cs_test_ URL for a known priceId', async ({
    page,
  }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const tiersResp = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: { Cookie: cookie },
    })
    const tiersBody = await tiersResp.json()
    const tiers: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }> =
      Array.isArray(tiersBody) ? tiersBody : (tiersBody.tiers ?? tiersBody.data)
    const proPrice = tiers
      .find((t) => t.key === 'pro')!
      .prices.find((p) => p.stripePriceId)!.stripePriceId
    expect(proPrice).toBeTruthy()

    const r = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: { priceId: proPrice },
    })
    expect(r.status()).toBe(200)
    const body = await r.json()
    expect(typeof body.checkoutUrl).toBe('string')
    expect(body.checkoutUrl).toMatch(/checkout\.stripe\.com\/.+\/cs_test_/)
  })

  test('POST /api/billing/checkout rejects an unknown priceId with 400', async ({ page }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const r = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: { priceId: 'price_does_not_exist' },
    })
    expect(r.status()).toBe(400)
  })

  test('POST /api/billing/cancel returns 4xx without an active subscription', async ({ page }) => {
    await signup(page)
    const cookie = await cookieHeader(page)
    const r = await page.request.post(`${API_BASE}/billing/cancel`, {
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      data: {},
    })
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
  })

  test('/pricing renders the three plan cards', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto('/pricing')
      await page.waitForLoadState('networkidle').catch(() => null)
      await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(/pro/i).first()).toBeVisible()
      await expect(page.getByText(/team/i).first()).toBeVisible()
    })
    const tiersCall = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(tiersCall, 'GET /api/billing/tiers was not observed during /pricing render').toBeTruthy()
  })

  test('/plan-updated is reachable post-checkout and renders the success copy', async ({
    page,
  }) => {
    await page.goto('/plan-updated')
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 })
  })
})
