/**
 * Billing — Stripe Checkout + cancel.
 *
 * Outcome assertions:
 * - POST /api/billing/checkout with a real Stripe price returns a real
 *   `cs_test_…` checkout URL on `checkout.stripe.com`.
 * - GET /api/billing/status returns `{planKey:'free', isFree:true}` for
 *   a brand-new account.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('billing', () => {
  test('GET /api/billing/status reports free for new account', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('bill-status'))
    const status = await page.request.get(`${API_BASE}/billing/status`, {
      headers: authHeaders(accessToken),
    })
    expect(status.status()).toBe(200)
    const body = (await status.json()) as { planKey: string; isFree: boolean }
    expect(body.planKey).toBe('free')
    expect(body.isFree).toBe(true)
  })

  test('POST /api/billing/checkout creates a real Stripe Checkout URL', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('bill-checkout'))
    const tiers = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: authHeaders(accessToken),
    })
    const tiersBody = (await tiers.json()) as {
      data: Array<{ key: string; prices: Array<{ period: string; stripePriceId: string | null }> }>
    }
    const pro = tiersBody.data.find((t) => t.key === 'pro')!
    const priceId = pro.prices.find((p) => p.period === 'month')?.stripePriceId
    expect(priceId, 'pro monthly Stripe price must be configured').toBeTruthy()

    const checkout = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(accessToken),
      data: { priceId },
    })
    expect(checkout.status()).toBe(200)
    const body = (await checkout.json()) as {
      checkoutUrl?: string
      data?: { checkoutUrl?: string }
    }
    const url = body.checkoutUrl ?? body.data?.checkoutUrl
    expect(url, 'real Stripe checkout URL').toMatch(/checkout\.stripe\.com\/c\/pay\/cs_test_/)
  })

  test('Settings "Choose" button on Pro tier navigates to Stripe', async ({ page }) => {
    await signup(page, uniqueEmail('bill-settings-cta'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForSelector('[data-testid="settings-upgrade-pro-month"]', { timeout: 15000 })
    // Intercept the navigation so the test runner doesn't actually leave Stripe
    // the request.
    const navigationPromise = page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 15000 })
    await page.getByTestId('settings-upgrade-pro-month').click()
    await navigationPromise
  })
})
