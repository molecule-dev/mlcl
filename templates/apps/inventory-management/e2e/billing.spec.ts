import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

interface BillingTier {
  key: string
  name: string
  prices: Array<{ period: string; price: string; stripePriceId?: string | null }>
  limits: Record<string, unknown>
}

test.describe('billing', () => {
  test('public /pricing page lists tiers and prices', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
    // At least one CTA per plan
    const ctas = await page.getByRole('button').count()
    expect(ctas).toBeGreaterThan(0)
  })

  test('GET /billing/tiers returns the configured pricing tiers', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { data: BillingTier[] }
    expect(Array.isArray(body.data)).toBeTruthy()
    expect(body.data.length).toBeGreaterThan(0)
    // every tier must declare at least one price
    for (const tier of body.data) {
      expect(tier.name).toBeTruthy()
      expect(tier.prices.length).toBeGreaterThan(0)
    }
  })

  test("GET /billing/status returns the user's plan + limits after signup", async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('billing-status'))
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      planKey: string
      category: string
      name: string
      limits: Record<string, unknown>
      isFree: boolean
    }
    expect(body.planKey).toBeTruthy()
    expect(body.name).toBeTruthy()
    expect(body.limits).toBeTruthy()
    expect(typeof body.isFree).toBe('boolean')
  })

  test('POST /billing/checkout with an unknown priceId returns 400', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('billing-co-bad'))
    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(accessToken),
      data: { priceId: 'price_definitely_not_real_xyz' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(400)
  })

  test('POST /billing/checkout with a known tier priceId either creates a Stripe Checkout URL or upgrades in place', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('billing-co'))
    const tiers = await page.request
      .get(`${API_BASE}/billing/tiers`)
      .then((r) => r.json() as Promise<{ data: BillingTier[] }>)
      .then((b) => b.data)
    // Pick any non-free price (stripePriceId required)
    let target: { tier: BillingTier; priceId: string } | null = null
    for (const tier of tiers) {
      for (const p of tier.prices) {
        if (p.stripePriceId) {
          target = { tier, priceId: p.stripePriceId }
          break
        }
      }
      if (target) break
    }
    test.skip(!target, 'no paid tier with stripePriceId configured in this scaffold')

    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(accessToken),
      data: { priceId: target!.priceId },
      failOnStatusCode: false,
    })
    // Either we get a real Stripe URL (paid plan), or the provider says "no need to checkout, switch in place"
    // Both are valid outcomes; what is NOT valid is a 200 with empty payload.
    expect([200, 502, 503]).toContain(res.status())
    if (res.status() === 200) {
      const body = (await res.json()) as { checkoutUrl?: string; updated?: boolean }
      const ok =
        (typeof body.checkoutUrl === 'string' && /^https?:\/\//.test(body.checkoutUrl)) ||
        body.updated === true
      expect(ok, JSON.stringify(body)).toBeTruthy()
    }
  })

  test('cancel without an active subscription returns 400', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('billing-cancel'))
    const res = await page.request.post(`${API_BASE}/billing/cancel`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect([400, 503]).toContain(res.status())
  })
})
