import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, signup } from './_helpers.js'

test.describe('billing', () => {
  test('pricing page renders all tiers from /api/billing/tiers', async ({ page }) => {
    await signup(page)
    const r = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(r.status()).toBe(200)
    const tiers = (await r.json()).data
    expect(tiers.length).toBeGreaterThan(1)
    for (const t of tiers) expect(t.key).toBeTruthy()

    await page.goto(`${APP_BASE}/pricing`)
    // Tier card data-mol-ids land in the DOM as data-mol-id="pricing-tier-<key>".
    for (const t of tiers) {
      await expect(page.locator(`[data-mol-id="pricing-tier-${t.key}"]`)).toBeVisible({
        timeout: 15_000,
      })
    }
  })

  test('POST /billing/checkout returns a real Stripe Checkout URL for a paid tier', async ({
    page,
  }) => {
    await signup(page)
    const tiersR = await page.request.get(`${API_BASE}/billing/tiers`)
    const tiers = (await tiersR.json()).data
    const monthly = tiers
      .flatMap((t: any) => t.prices.map((p: any) => ({ ...p, tierKey: t.key })))
      .find((p: any) => p.stripePriceId && p.period === 'month')
    expect(monthly?.stripePriceId, 'no paid monthly tier configured').toBeTruthy()

    const r = await page.request.post(`${API_BASE}/billing/checkout`, {
      data: { priceId: monthly.stripePriceId },
      headers: { 'content-type': 'application/json' },
    })
    expect(r.status()).toBe(200)
    const body = await r.json()
    expect(body.checkoutUrl, 'missing checkoutUrl').toBeTruthy()
    expect(body.checkoutUrl).toMatch(/checkout\.stripe\.com\/(c\/pay\/)?cs_test_/)
  })

  test('GET /billing/status reflects free tier for a fresh user', async ({ page }) => {
    await signup(page)
    const r = await page.request.get(`${API_BASE}/billing/status`)
    expect(r.status()).toBe(200)
    const body = await r.json()
    expect(body.isFree).toBe(true)
    expect(body.planKey).toBe('free')
    expect(body.limits).toBeTruthy()
  })

  test('checkout rejects unknown priceId with a 400', async ({ page }) => {
    await signup(page)
    const r = await page.request.post(`${API_BASE}/billing/checkout`, {
      data: { priceId: 'price_does_not_exist' },
      headers: { 'content-type': 'application/json' },
    })
    expect(r.status()).toBe(400)
  })

  test('Pricing → click Upgrade → real Stripe checkout redirect fires', async ({ page }) => {
    await signup(page)
    await page.goto(`${APP_BASE}/pricing`)
    const cta = page.locator('[data-mol-id^="pricing-cta-"]:not([disabled])').first()
    await expect(cta).toBeVisible({ timeout: 15_000 })
    // Wait for the actual top-level navigation to checkout.stripe.com.
    // The PricingPage hook calls window.location.assign(checkoutUrl), so the
    // page navigates outright. Use waitForURL which observes whatever the
    // page commits to.
    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com\/(c\/pay\/)?cs_test_/, { timeout: 30_000 }),
      cta.click(),
    ])
    expect(page.url()).toMatch(/checkout\.stripe\.com\/(c\/pay\/)?cs_test_/)
  })
})
