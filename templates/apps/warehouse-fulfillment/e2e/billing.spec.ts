import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiHeaders, API_BASE, signup } from './_helpers.js'

test.describe('/pricing → /billing/checkout produces a real Stripe Checkout URL', () => {
  test('public pricing renders three tiers; logged-in upgrade returns cs_test_ URL', async ({
    page,
  }) => {
    // Public landing first — no auth required.
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id^="pricing-tier-"]').first()).toBeVisible({
      timeout: 15000,
    })
    // Three configured tiers: free, pro, team — every one renders.
    await expect(page.locator('[data-mol-id="pricing-tier-free"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="pricing-tier-pro"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="pricing-tier-team"]')).toBeVisible()

    // Sign up so we have an authenticated user able to upgrade.
    const { accessToken } = await signup(page)

    // Get tiers from the API (authenticated) and pick the first paid tier (has stripePriceId).
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    expect(tiersRes.ok(), await tiersRes.text()).toBe(true)
    const json = (await tiersRes.json()) as
      | { data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }> }
      | Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    const tiers = Array.isArray(json) ? json : json.data
    const paid = tiers
      .flatMap((t) => t.prices.map((p) => ({ key: t.key, stripePriceId: p.stripePriceId })))
      .find((x) => x.stripePriceId)
    test.skip(!paid, 'no paid stripePriceId configured')
    if (!paid) return

    // POST /api/billing/checkout directly — same call the Pricing CTA makes,
    // but we capture the URL without triggering a navigation away from the
    // page (Stripe URLs would otherwise redirect out of the test).
    const checkoutRes = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId: paid.stripePriceId, period: 'month' },
      failOnStatusCode: false,
    })
    expect(checkoutRes.ok(), await checkoutRes.text()).toBe(true)
    const body = (await checkoutRes.json()) as { checkoutUrl?: string; url?: string }
    const url = body.checkoutUrl ?? body.url ?? ''
    expect(url, 'checkout URL').toMatch(/checkout\.stripe\.com|cs_test_/i)
  })
})
