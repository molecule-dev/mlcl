import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers.js'

/**
 * Pricing page is the gateway to revenue. Every assertion here proves
 * a real paying-customer flow, not just "click handler fired":
 *
 * - The page loads from a public route (no auth required for browsing).
 * - GET /api/billing/tiers actually returns the three tiers we ship.
 * - Clicking "Upgrade to Pro" hits POST /api/billing/checkout AND the
 *   server returns a real Stripe Checkout URL (not a stub) AND the
 *   browser navigates there. We don't follow the redirect into Stripe's
 *   domain (that's their UI to test) but we DO assert the URL host is
 *   stripe.com.
 * - Free tier renders a disabled "Current plan" CTA (no priceId).
 */
test.describe('pricing', () => {
  test('public pricing page renders all three tiers from /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    await expect(page.locator('[data-mol-id="pricing-tier-free"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="pricing-tier-pro"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="pricing-tier-team"]')).toBeVisible()
    const tiersCall = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
    expect(tiersCall, 'GET /api/billing/tiers should fire on /pricing').toBeTruthy()
    expect(tiersCall!.status).toBe(200)
  })

  test('renders the pricing page heading', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const h1 = page.getByRole('heading', { level: 1 }).first()
    await expect(h1).toBeVisible({ timeout: 10_000 })
  })

  test('free tier CTA is the "Current plan" label and disabled (no priceId)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const cta = page.locator('[data-mol-id="pricing-cta-free"]')
    await expect(cta).toBeVisible()
    await expect(cta).toBeDisabled()
    await expect(cta).toHaveText(/Current plan/i)
  })

  test('Upgrade-to-Pro hits POST /api/billing/checkout and the user lands on checkout.stripe.com', async ({
    page,
  }) => {
    await signup(page)

    // Server-side proof: directly POSTing to /billing/checkout with the Pro
    // monthly priceId returns a real Stripe URL. This avoids the race where
    // page.on('response') can't read the body after the SPA's
    // window.location.assign() detaches it.
    const tiersRes = await page.request.get(API_BASE + '/billing/tiers')
    const tiers = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ period: string; stripePriceId: string | null }> }>
    }
    const pro = tiers.data.find((t) => t.key === 'pro')
    const proMonthly = pro?.prices.find((p) => p.period === 'month')?.stripePriceId
    expect(proMonthly, 'Pro monthly priceId should be wired').toMatch(/^price_/)
    const checkoutRes = await page.request.post(API_BASE + '/billing/checkout', {
      data: { priceId: proMonthly },
    })
    expect(checkoutRes.status(), 'direct checkout POST status').toBe(200)
    const checkoutBody = (await checkoutRes.json()) as { checkoutUrl?: string }
    expect(checkoutBody.checkoutUrl, 'real Stripe checkout URL returned').toMatch(
      /^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/,
    )

    // UI proof: clicking the Pro CTA actually navigates to checkout.stripe.com.
    await page.goto(APP_BASE + '/pricing')
    await page.locator('[data-mol-id="pricing-cta-pro"]').click()
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 })
    expect(page.url(), 'browser landed on Stripe Checkout').toMatch(
      /^https:\/\/checkout\.stripe\.com\//,
    )
  })

  test('GET /api/billing/tiers returns three tiers with the correct shape', async ({ page }) => {
    const res = await page.request.get(API_BASE + '/billing/tiers')
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      data: Array<{
        key: string
        name: string
        prices: Array<{ period: string; stripePriceId: string | null }>
      }>
    }
    const keys = body.data.map((t) => t.key)
    expect(keys).toEqual(['free', 'pro', 'team'])
    const pro = body.data.find((t) => t.key === 'pro')
    // Pro must ship a real Stripe priceId in test mode (env from fill-smoke-env)
    expect(pro?.prices.find((p) => p.period === 'month')?.stripePriceId).toMatch(/^price_/)
  })

  test('checkout endpoint rejects unknown priceId with 400', async ({ page }) => {
    await signup(page)
    const res = await page.request.post(API_BASE + '/billing/checkout', {
      data: { priceId: 'price_DOES_NOT_EXIST' },
    })
    expect(res.status()).toBe(400)
  })
})
