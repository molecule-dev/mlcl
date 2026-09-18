/**
 * /pricing — tier ladder renders with real Stripe IDs and the checkout
 * endpoint returns a real Stripe Checkout session URL when called with
 * a real price.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiSignupAndPrime, authHeaders, uniqueEmail } from './_helpers.js'

interface Tier {
  key: string
  prices: { period: string; stripePriceId: string | null }[]
}

test.describe('pricing page', () => {
  test('renders Free / Pro / Team tier cards', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    // Auto-wait for the tier cards to render — `<PricingPage />` shows a
    // "Loading plans…" placeholder until `/api/billing/tiers` resolves,
    // so a synchronous `body.innerText()` would race the React mount.
    await expect(page.locator('[data-mol-id="pricing-tier-free"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="pricing-tier-pro"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="pricing-tier-team"]')).toBeVisible()
    const text = await page.locator('body').innerText()
    expect(text).toMatch(/Free/i)
    expect(text).toMatch(/Pro/i)
    expect(text).toMatch(/Team/i)
  })

  test('paid tiers show "Upgrade" CTA when STRIPE_TEAM_CHAT_* IDs are configured', async ({
    page,
  }) => {
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`)
    const tiersBody = (await tiersRes.json()) as { data: Tier[] }
    const proHasPrice = tiersBody.data
      .find((t) => t.key === 'pro')
      ?.prices.some((p) => p.stripePriceId)
    test.skip(!proHasPrice, 'STRIPE_TEAM_CHAT_PRO_MONTHLY/YEARLY not configured in env')
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-cta-pro"]')).toContainText(/upgrade/i)
    await expect(page.locator('[data-mol-id="pricing-cta-team"]')).toContainText(/upgrade/i)
  })

  test('checkout endpoint returns a real Stripe session URL for a paid price', async ({ page }) => {
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`)
    const tiersBody = (await tiersRes.json()) as { data: Tier[] }
    const priceId = tiersBody.data
      .find((t) => t.key === 'pro')
      ?.prices.find((p) => p.stripePriceId)?.stripePriceId
    test.skip(!priceId, 'STRIPE_TEAM_CHAT_PRO_MONTHLY not configured in env')
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('billing'))
    const co = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(accessToken),
      data: {
        priceId,
        tierKey: 'pro',
        period: 'month',
        successUrl: APP_BASE + '/plan-updated',
        cancelUrl: APP_BASE + '/pricing',
      },
    })
    expect(co.status()).toBe(200)
    const body = (await co.json()) as { checkoutUrl?: string }
    expect(body.checkoutUrl).toMatch(/checkout\.stripe\.com/)
  })
})
