/**
 * /pricing — public pricing page rendered by `@molecule/app-billing-react`'s
 * PricingPage. Verifies the tier ladder reads from /api/billing/tiers and
 * that the upgrade CTA actually starts a Stripe Checkout (real test-mode
 * Stripe URL — no mocks).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

const apiBase = () => `http://localhost:${process.env.API_PORT || '4020'}/api`

test.describe('pricing page', () => {
  test('lists Free + Pro tiers and the page mount fetches /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(page.locator('body')).toContainText(/free/i, { timeout: 10000 })
      await expect(page.locator('body')).toContainText(/pro/i)
    })
    expect(
      reqs.some((r) => r.method === 'GET' && r.url.includes('/api/billing/tiers')),
      'GET /api/billing/tiers fired on mount',
    ).toBeTruthy()
  })

  test('GET /api/billing/tiers returns price IDs for the paid tier', async ({ request }) => {
    const res = await request.get(`${apiBase()}/billing/tiers`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const proTier = body.data.find((t) => t.key === 'pro')
    expect(proTier, 'pro tier exists').toBeTruthy()
    const monthly = proTier!.prices.find(
      (p) => p.stripePriceId && p.stripePriceId.startsWith('price_'),
    )
    expect(monthly, 'pro tier has at least one real Stripe priceId').toBeTruthy()
  })

  test('Upgrading to Pro creates a real Stripe Checkout session URL', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pricing-upgrade'))

    // Pull a valid Pro priceId from /api/billing/tiers (no hardcoding).
    const tiersRes = await page.request.get(`${apiBase()}/billing/tiers`)
    const tiersBody = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const proTier = tiersBody.data.find((t) => t.key === 'pro')
    const priceId = proTier!.prices.find((p) => p.stripePriceId)!.stripePriceId!

    const checkoutRes = await page.request.post(`${apiBase()}/billing/checkout`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      data: { priceId },
    })
    expect(checkoutRes.status(), await checkoutRes.text()).toBe(200)
    const body = (await checkoutRes.json()) as { checkoutUrl?: string; updated?: boolean }
    // Stripe Checkout for a brand-new user always redirects out (no existing
    // subscription to update). So `checkoutUrl` must be a real Stripe URL.
    expect(body.checkoutUrl, 'response.checkoutUrl').toBeTruthy()
    expect(body.checkoutUrl!).toMatch(/^https:\/\/checkout\.stripe\.com\//)
  })

  test('Unknown priceId is rejected with a 400 (no silent success)', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('pricing-bad'))
    const res = await page.request.post(`${apiBase()}/billing/checkout`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      data: { priceId: 'price_FAKE_NOT_REGISTERED' },
    })
    expect(res.status()).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBeTruthy()
  })
})
