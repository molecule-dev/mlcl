import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, getAccessToken, signup } from './_helpers.js'

test.describe('pricing + billing', () => {
  test('/pricing renders the public pricing page (no auth required)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
    })
    // PricingPage renders the section[data-mol-id=pricing-page] container.
    await expect(page.locator('[data-mol-id="pricing-page"]')).toBeVisible({ timeout: 15_000 })
    // 3 tier cards (free/pro/team) — seed app declares all three.
    await expect(page.getByRole('heading', { name: /^Free$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Pro$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Team$/i })).toBeVisible()
    expect(reqs.some((r) => /\/api\/billing\/tiers$/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('GET /api/billing/tiers returns the 3-tier ladder', async ({ page }) => {
    await signup(page)
    const r = await page.request.get(API_BASE + '/billing/tiers')
    expect(r.status()).toBe(200)
    const body = (await r.json()) as {
      data?: Array<{ key: string; prices?: Array<{ stripePriceId?: string | null }> }>
    }
    const tiers = body.data ?? []
    expect(tiers.length).toBeGreaterThanOrEqual(3)
    const keys = tiers.map((t) => t.key)
    expect(keys).toEqual(expect.arrayContaining(['free', 'pro', 'team']))
    const pro = tiers.find((t) => t.key === 'pro')
    expect(pro?.prices?.length, 'pro tier must declare at least one price').toBeGreaterThan(0)
  })

  test('GET /api/billing/status reports the user planKey', async ({ page }) => {
    await signup(page)
    const r = await page.request.get(API_BASE + '/billing/status', {
      headers: {
        Authorization: `Bearer ${await getAccessToken(page)}`,
      },
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as { planKey?: string; isFree?: boolean }
    // Brand-new signup → free tier.
    expect(body.planKey).toBe('free')
    expect(body.isFree).toBe(true)
  })

  test('POST /api/billing/checkout rejects an unknown priceId with 400', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const r = await page.request.post(API_BASE + '/billing/checkout', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { priceId: 'price_does_not_exist' },
    })
    expect(r.status()).toBe(400)
    const body = (await r.json()) as { error?: string }
    expect(body.error).toMatch(/unknown.*price/i)
  })

  test('POST /api/billing/checkout requires authentication', async ({ page }) => {
    const r = await page.request.post(API_BASE + '/billing/checkout', {
      headers: { 'Content-Type': 'application/json' },
      data: { priceId: 'anything' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(401)
  })

  test('POST /api/billing/cancel responds even without an active subscription', async ({
    page,
  }) => {
    // Without a real Stripe key the bond returns 503 ("provider unavailable")
    // rather than 4xx — both are acceptable, but it MUST NOT 5xx with a
    // stack trace and MUST NOT 200 (no sub to cancel).
    await signup(page)
    const token = await getAccessToken(page)
    const r = await page.request.post(API_BASE + '/billing/cancel', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    })
    expect([400, 404, 409, 503].includes(r.status()), `unexpected status ${r.status()}`).toBe(true)
  })
})
