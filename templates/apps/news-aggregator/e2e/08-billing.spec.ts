import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedFetch, signup, uniqueEmail } from './_helpers.js'

test.describe('billing', () => {
  test('Pricing page renders tiers from /api/billing/tiers (real Stripe price ids)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/pricing')
    const resp = await page.waitForResponse(
      (r) => /\/api\/billing\/tiers/.test(r.url()) && r.status() === 200,
      { timeout: 10_000 },
    )
    const body = (await resp.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    expect(body.data.length).toBeGreaterThan(1)
    const pro = body.data.find((t) => t.key === 'pro')
    expect(pro).toBeTruthy()
    // Pro must have a real Stripe price id (test-mode `price_…`).
    const proMonthly = pro!.prices.find((p) => p.stripePriceId?.startsWith('price_'))
    expect(proMonthly?.stripePriceId).toMatch(/^price_/)
  })

  test('Upgrade to Pro creates a real Stripe Checkout session', async ({ page }) => {
    await signup(page, uniqueEmail('na-upgrade'))
    // Arm the waiter BEFORE the navigation so we don't miss the response
    // when /api/billing/tiers lands faster than the `await page.goto()`
    // microtask returns.
    const tiersLoaded = page.waitForResponse(
      (r) => /\/api\/billing\/tiers/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/pricing')
    await tiersLoaded

    const upgrade = page.locator('[data-mol-id="pricing-cta-pro"]').first()
    await expect(upgrade).toBeVisible()
    await expect(upgrade).toBeEnabled()

    // The PricingPage calls `window.location.assign(response.checkoutUrl)`
    // immediately on success, so the user-visible promise is "land on the
    // real Stripe Checkout host". Asserting on the navigation target is
    // a stronger contract than fishing the URL out of the JSON body.
    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 30_000 }),
      upgrade.click(),
    ])
    expect(page.url()).toMatch(/checkout\.stripe\.com|cs_test_/)
  })

  test('POST /api/billing/checkout returns a real Stripe Checkout URL', async ({ page }) => {
    await signup(page, uniqueEmail('na-checkout-api'))
    await page.goto(APP_BASE + '/pricing')
    // Pull the live tiers from the page so the request body uses the real
    // Stripe priceId returned by the server (not a hardcoded literal).
    const tiers = await page.evaluate(async () => {
      const resp = await fetch('/api/billing/tiers')
      return (await resp.json()) as {
        data: Array<{
          key: string
          prices: Array<{ stripePriceId: string | null; interval?: string | null }>
        }>
      }
    })
    const pro = tiers.data.find((t) => t.key === 'pro')
    const monthly = pro?.prices.find((p) => p.stripePriceId?.startsWith('price_'))
    expect(monthly?.stripePriceId).toMatch(/^price_/)

    const result = await authedFetch(
      page,
      '/api/billing/checkout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: monthly!.stripePriceId }),
      },
      { withStatus: true },
    )
    expect(result.status).toBeLessThan(400)
    const body = result.body as { checkoutUrl?: string; url?: string } | null
    const url = body?.checkoutUrl ?? body?.url ?? ''
    expect(url).toMatch(/checkout\.stripe\.com|cs_test_/)
  })
})
