/**
 * Billing tier surface.
 *
 *   - GET /api/billing/status returns the user's actual plan (defaults
 *     to "Free" for fresh accounts).
 *   - GET /api/billing/tiers returns the pricing-page catalog.
 *   - POST /api/billing/checkout starts a real Stripe subscription
 *     checkout session for the cheapest paid tier.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('billing', () => {
  test('billing status reports plan name + isFree=true for new users', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('billing-status'))
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      planKey: string
      name: string
      isFree: boolean
    }
    expect(body.isFree).toBe(true)
    expect(body.name).toBeTruthy()
    expect(body.planKey).toBeTruthy()
  })

  test('billing tiers returns at least one paid tier with a stripePriceId', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      data: Array<{ planKey: string; prices: Array<{ stripePriceId?: string }> }>
    }
    expect(Array.isArray(body.data)).toBe(true)
    const paid = body.data.flatMap((t) => t.prices).filter((p) => p.stripePriceId)
    expect(paid.length, 'at least one tier must expose a stripePriceId').toBeGreaterThan(0)
  })

  test('checkout for a real priceId returns a Stripe Checkout URL', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('billing-checkout'))
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`)
    const tiersBody = (await tiersRes.json()) as {
      data: Array<{ prices: Array<{ stripePriceId?: string }> }>
    }
    const priceId = tiersBody.data
      .flatMap((t) => t.prices)
      .map((p) => p.stripePriceId)
      .find((id) => !!id)
    expect(priceId, 'no stripePriceId in tiers fixture').toBeTruthy()
    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(accessToken),
      data: { priceId },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { checkoutUrl?: string; updated?: boolean }
    if (body.checkoutUrl) {
      expect(body.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//)
    } else {
      // The provider may shortcut to "updated" if the user already has a
      // sub on this priceId — either path is correct.
      expect(body.updated).toBe(true)
    }
  })

  test('settings panel reads /api/billing/status (network)', async ({ page }) => {
    await signup(page, uniqueEmail('billing-panel'))
    // Set up listener BEFORE navigating so we don't miss the response.
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/billing/status') && r.request().method() === 'GET',
      { timeout: 10000 },
    )
    await page.goto(APP_BASE + '/settings')
    const res = await responsePromise
    expect(res.status()).toBe(200)
  })
})
