import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiHeaders, API_BASE, signup } from './_helpers.js'

test.describe('billing + tiers + checkout', () => {
  test("GET /billing/status returns the user's effective plan (free by default)", async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.get(`${API_BASE}/billing/status`, {
      headers: apiHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as {
      planKey: string
      isFree: boolean
      limits: { maxPages: number; maxSpaces: number }
    }
    expect(body.planKey).toBe('free')
    expect(body.isFree).toBe(true)
    expect(body.limits.maxPages).toBe(5)
    expect(body.limits.maxSpaces).toBe(5)
  })

  test('GET /billing/tiers returns free + pro + team', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    expect(body.data.map((t) => t.key)).toEqual(['free', 'pro', 'team'])
    // Pro + team should each have at least one stripe price id (set in env).
    const pro = body.data.find((t) => t.key === 'pro')!
    const team = body.data.find((t) => t.key === 'team')!
    expect(pro.prices.find((p) => p.stripePriceId)).toBeDefined()
    expect(team.prices.find((p) => p.stripePriceId)).toBeDefined()
  })

  test('POST /billing/checkout returns a Stripe checkout URL for a known priceId', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    const { data } = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const proPrice = data.find((t) => t.key === 'pro')!.prices.find((p) => p.stripePriceId)!
    expect(proPrice.stripePriceId).toBeTruthy()

    const r = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId: proPrice.stripePriceId },
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as { checkoutUrl?: string; updated?: boolean }
    // Either a checkout URL (new sub) or `updated:true` (existing sub being upgraded).
    expect(Boolean(body.checkoutUrl) || body.updated === true).toBe(true)
    if (body.checkoutUrl) {
      expect(body.checkoutUrl).toMatch(/^https?:\/\//)
    }
  })

  test('Pricing page renders tiers from /billing/tiers', async ({ page }) => {
    await signup(page)
    await page.goto('/pricing')
    // Pricing page should display all tiers — at minimum "Free", "Pro", "Team".
    await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/pro/i).first()).toBeVisible()
    await expect(page.getByText(/team/i).first()).toBeVisible()
  })
})
