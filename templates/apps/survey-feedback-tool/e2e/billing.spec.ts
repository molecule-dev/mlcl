import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { authedRequest, signup } from './_helpers.js'

test.describe('billing', () => {
  test('GET /billing/tiers returns the configured pricing tiers with real Stripe priceIds', async ({
    page,
  }) => {
    const u = await signup(page)
    const res = await authedRequest(page, u.accessToken, 'GET', '/billing/tiers')
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      data: Array<{
        key: string
        name: string
        prices: Array<{ stripePriceId: string | null; period: string }>
      }>
    }
    const keys = body.data.map((t) => t.key)
    expect(keys).toEqual(expect.arrayContaining(['free', 'pro', 'team']))
    const pro = body.data.find((t) => t.key === 'pro')!
    const proMonthly = pro.prices.find((p) => p.period === 'month')!
    expect(proMonthly.stripePriceId, 'pro monthly price must be wired').toMatch(/^price_/)
  })

  test('GET /billing/status returns free for a new user', async ({ page }) => {
    const u = await signup(page)
    const res = await authedRequest(page, u.accessToken, 'GET', '/billing/status')
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      planKey: string
      isFree: boolean
      limits: Record<string, unknown>
    }
    expect(body.planKey).toBe('free')
    expect(body.isFree).toBe(true)
    expect(body.limits).toBeDefined()
  })

  test('POST /billing/checkout returns a real Stripe checkout URL', async ({ page }) => {
    const u = await signup(page)
    const tiers = await authedRequest(page, u.accessToken, 'GET', '/billing/tiers')
    const tiersBody = (await tiers.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const proPriceId = tiersBody.data
      .find((t) => t.key === 'pro')!
      .prices.find((p) => p.stripePriceId)!.stripePriceId!
    expect(proPriceId).toMatch(/^price_/)

    const co = await authedRequest(page, u.accessToken, 'POST', '/billing/checkout', {
      priceId: proPriceId,
    })
    expect(co.status()).toBe(200)
    const body = (await co.json()) as { checkoutUrl?: string }
    expect(
      body.checkoutUrl,
      'checkout must return a real Stripe Checkout URL, not a placeholder',
    ).toMatch(/^https:\/\/checkout\.stripe\.com\//)
  })

  test('POST /billing/checkout rejects unknown price ids with 400', async ({ page }) => {
    const u = await signup(page)
    const co = await authedRequest(page, u.accessToken, 'POST', '/billing/checkout', {
      priceId: 'price_TOTALLY_FAKE',
    })
    expect(co.status()).toBe(400)
  })
})
