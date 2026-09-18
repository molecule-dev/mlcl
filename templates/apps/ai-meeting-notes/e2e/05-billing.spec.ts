import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup, uniqueEmail } from './_helpers.js'

/**
 * Billing flow.
 *  - GET /api/billing/tiers returns the four-tier ladder with real Stripe
 *    price IDs (so the upgrade button has something to send).
 *  - GET /api/billing/status reports the user's current plan key.
 *  - POST /api/billing/checkout returns a real checkout.stripe.com URL
 *    when given a valid priceId — proving the Stripe key + price IDs are
 *    actually plumbed.
 */

async function getAccessToken(email: string, password: string): Promise<string> {
  const res = await fetch(API_BASE + '/users/log-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`log-in failed: ${res.status}`)
  const json = (await res.json()) as { accessToken: string }
  return json.accessToken
}

test.describe('billing', () => {
  test('GET /api/billing/tiers returns Free + Pro + Team with real Stripe price IDs', async () => {
    const res = await fetch(API_BASE + '/billing/tiers')
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const keys = json.data.map((t) => t.key)
    expect(keys).toEqual(expect.arrayContaining(['free', 'pro', 'team']))
    const pro = json.data.find((t) => t.key === 'pro')!
    expect(pro.prices.some((p) => p.stripePriceId?.startsWith('price_'))).toBe(true)
  })

  test('GET /api/billing/status reports free plan for fresh signup', async ({ page }) => {
    const email = uniqueEmail('aimn-status')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const token = await getAccessToken(email, password)
    const res = await fetch(API_BASE + '/billing/status', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = (await res.json()) as {
      planKey: string
      isFree: boolean
      limits: Record<string, unknown>
    }
    expect(json.planKey).toBe('free')
    expect(json.isFree).toBe(true)
    expect(json.limits.maxMeetings).toBe(5)
  })

  test('POST /api/billing/checkout returns a real Stripe Checkout URL for the Pro Monthly price', async ({
    page,
  }) => {
    const email = uniqueEmail('aimn-checkout')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const token = await getAccessToken(email, password)

    // Pull the Pro Monthly price ID from the public tiers endpoint so
    // we don't hardcode an env-specific value.
    const tiers = (await fetch(API_BASE + '/billing/tiers').then((r) => r.json())) as {
      data: Array<{ key: string; prices: Array<{ period: string; stripePriceId: string | null }> }>
    }
    const pro = tiers.data.find((t) => t.key === 'pro')!
    const proMonthly = pro.prices.find((p) => p.period === 'month')!
    const priceId = proMonthly.stripePriceId
    expect(priceId, 'pro monthly stripePriceId must be configured').toBeTruthy()

    const res = await fetch(API_BASE + '/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ priceId }),
    })
    const text = await res.text()
    expect(res.status, text).toBe(200)
    const json = JSON.parse(text) as { checkoutUrl?: string; updated?: boolean }
    expect(json.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//)
  })

  test('Pricing page renders the tiers from the API', async ({ page }) => {
    await signup(page, uniqueEmail('aimn-pricing'), 'TestPass123!')
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /choose your.*plan/i })).toBeVisible()
    // All three plan names should render.
    await expect(page.getByText(/^Free$/).first()).toBeVisible()
    await expect(page.getByText(/^Pro$/).first()).toBeVisible()
    await expect(page.getByText(/^Team$/).first()).toBeVisible()
  })
})
