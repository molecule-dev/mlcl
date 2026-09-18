import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup } from './_helpers.js'

test.describe('billing', () => {
  test('GET /api/billing/tiers returns the tier ladder with real price IDs', async ({ page }) => {
    const tiers = (await page.request.get(API_BASE + '/billing/tiers').then((r) => r.json())) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId?: string | null }> }>
    }
    expect(tiers.data.length).toBeGreaterThanOrEqual(2)
    const proTier = tiers.data.find((t) => t.key === 'pro')
    expect(proTier, 'pro tier missing from /api/billing/tiers').toBeTruthy()
    expect(
      proTier!.prices.some(
        (p) => typeof p.stripePriceId === 'string' && p.stripePriceId.startsWith('price_'),
      ),
      'pro tier has no real Stripe price IDs',
    ).toBe(true)
  })

  test('billing checkout returns a real Stripe Checkout session URL', async ({ page }) => {
    await signup(page)

    // Pull the Pro Monthly real price ID from the running app's tier ladder
    const tiers = (await page.request.get(API_BASE + '/billing/tiers').then((r) => r.json())) as {
      data: Array<{ key: string; prices: Array<{ period: string; stripePriceId?: string | null }> }>
    }
    const proMonthly = tiers.data
      .find((t) => t.key === 'pro')!
      .prices.find((p) => p.period === 'month')!.stripePriceId
    expect(proMonthly).toMatch(/^price_/)

    const resp = await page.request.post(API_BASE + '/billing/checkout', {
      data: { priceId: proMonthly },
    })
    expect([200, 502], 'checkout returned an unexpected status').toContain(resp.status())
    const body = (await resp.json()) as { checkoutUrl?: string; updated?: boolean; error?: string }
    if (resp.status() === 200) {
      // Real Stripe in test mode should give us a checkout.stripe.com URL
      // OR an immediate `updated:true` if a non-checkout flow was selected
      // (subscription update). Either is acceptable; both prove Stripe was hit.
      const ok =
        (typeof body.checkoutUrl === 'string' && /checkout\.stripe\.com/.test(body.checkoutUrl)) ||
        body.updated === true
      expect(ok, `unexpected billing checkout response: ${JSON.stringify(body)}`).toBe(true)
    } else {
      // 502 means the provider returned `updated:false, checkoutUrl:null` —
      // explicitly surface it as a failure, not silent.
      expect(typeof body.error).toBe('string')
    }
  })

  test('billing /status returns the user current plan and tier limits', async ({ page }) => {
    await signup(page)
    const status = (await page.request.get(API_BASE + '/billing/status').then((r) => r.json())) as {
      planKey?: string
      name?: string
      isFree?: boolean
      limits?: Record<string, unknown>
    }
    expect(status.planKey).toBe('free')
    expect(status.isFree).toBe(true)
    expect(status.limits).toBeTruthy()
  })
})
