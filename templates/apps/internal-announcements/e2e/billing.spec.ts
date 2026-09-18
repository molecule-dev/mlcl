/**
 * /pricing — Stripe checkout integration.
 *
 * The contract is real money: clicking "Upgrade" must mint a genuine
 * Stripe Checkout session (cs_test_… session id, checkout.stripe.com
 * URL) so a paying customer can actually pay. A response with a 200
 * is not enough — past flagships have shipped 200 from a checkout
 * route that was actually a no-op. This spec asserts on the redirect
 * URL the user lands at AND on the response payload shape.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('billing checkout', () => {
  test('clicking an Upgrade button mints a real Stripe checkout session', async ({ page }) => {
    await signup(page, uniqueEmail('pricing-stripe'))
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')

    // Find an actionable upgrade button. The /pricing page renders 3 plan
    // cards (Free / Pro / Team) with monthly+yearly toggles; the buttons
    // are labelled "Upgrade", "Choose…", "Subscribe…", or similar
    // depending on i18n. The first non-disabled paid-plan button is a
    // safe target.
    const upgrade = page
      .getByRole('button', { name: /upgrade|select|choose|start|subscribe/i })
      .first()
    await expect(upgrade).toBeVisible()

    const reqs = await captureNetwork(page, async () => {
      await Promise.all([
        page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 }),
        upgrade.click(),
      ])
    })

    // 1. POST /api/billing/checkout was made and returned 200
    const checkoutCall = reqs.find(
      (r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url),
    )
    expect(checkoutCall, 'POST /api/billing/checkout was not made').toBeTruthy()
    expect(checkoutCall!.status).toBe(200)

    // 2. Browser actually landed on a Stripe-hosted checkout page with
    // a `cs_test_…` session id. This is the difference between a real
    // Stripe session and a placeholder redirect.
    const finalUrl = page.url()
    expect(finalUrl).toMatch(/checkout\.stripe\.com/)
    expect(finalUrl).toMatch(/cs_test_/)
  })

  test('GET /api/billing/tiers returns the plan ladder with stripePrice ids', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pricing-tiers'))
    const res = await page.request.get(APP_BASE + '/api/billing/tiers', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(res.status()).toBeLessThan(400)
    const body = (await res.json()) as {
      data?: Array<{
        key: string
        prices: Array<{ period: string; price: string; stripePriceId: string | null }>
      }>
    }
    const tiers = body.data
    expect(Array.isArray(tiers)).toBe(true)
    const keys = tiers!.map((t) => t.key)
    expect(keys).toContain('free')
    const paidPrices = tiers!.flatMap((t) =>
      t.prices.filter(
        (p) => typeof p.stripePriceId === 'string' && p.stripePriceId.startsWith('price_'),
      ),
    )
    expect(
      paidPrices.length,
      'at least one paid plan must have a real Stripe price id',
    ).toBeGreaterThan(0)
  })
})
