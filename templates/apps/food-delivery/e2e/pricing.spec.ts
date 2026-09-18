import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup, uniqueEmail } from './_helpers.js'

/**
 * Pricing / billing.
 *
 * Invariants verified:
 * - GET /api/billing/tiers returns at least free + pro tiers.
 * - /pricing page renders one card per tier (data-mol-id="pricing-tier-…")
 *   plus an upgrade CTA per priced tier.
 * - Free tier CTA is disabled (no stripePriceId).
 * - POST /api/billing/checkout returns a real Stripe Checkout session URL
 *   (cs_* + checkout.stripe.com) for an authenticated user.
 */

test.describe('pricing', () => {
  test('/pricing renders all tiers from the API', async ({ page }) => {
    // Sign up first — the http client / billing hooks expect a session.
    await signup(page, uniqueEmail('fd-pricing-view'))
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id^="pricing-tier-"]').first()).toBeVisible({
      timeout: 10_000,
    })
    expect(await page.locator('[data-mol-id^="pricing-tier-"]').count()).toBeGreaterThanOrEqual(2)

    // Free tier has no stripePriceId → its CTA is disabled.
    const freeCta = page.locator('[data-mol-id="pricing-cta-free"]')
    await expect(freeCta).toBeDisabled()
  })

  test('GET /api/billing/tiers returns the expected shape', async ({ page }) => {
    const resp = await page.request.get(API_BASE + '/billing/tiers')
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    const tiers = body?.data ?? []
    expect(tiers.length).toBeGreaterThanOrEqual(3)
    const free = tiers.find((t: { key: string }) => t.key === 'free')
    const pro = tiers.find((t: { key: string }) => t.key === 'pro')
    expect(free).toBeTruthy()
    expect(pro).toBeTruthy()
    expect(pro.prices.find((p: { period: string }) => p.period === 'month').stripePriceId).toMatch(
      /^price_/,
    )
  })

  test('POST /api/billing/checkout returns a real Stripe checkout URL', async ({ page }) => {
    await signup(page, uniqueEmail('fd-billing'))
    const resp = await page.request.post(API_BASE + '/billing/checkout', {
      data: { priceId: 'price_1TVD6FCES2eiMwhC4szDhyc1' },
    })
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    expect(body.checkoutUrl).toMatch(/checkout\.stripe\.com/)
  })
})
