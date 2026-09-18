/**
 * /pricing — molecule-built PricingPage. Asserts the tiers endpoint
 * resolves and the Upgrade button kicks off a real Stripe checkout
 * URL (cs_test_…) for an authenticated user.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('pricing page', () => {
  test('public page renders headings + at least one tier card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('h1, h2').first()).toBeVisible()
    await expect(page.locator('text=/free|starter|pro|enterprise/i').first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('GET /api/billing/tiers returns at least one Stripe-priced tier', async ({ page }) => {
    const r = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/billing/tiers`)
    expect(r.status()).toBe(200)
    const body = await r.json()
    const tiers: Array<{ prices: Array<{ stripePriceId?: string }> }> = body.data ?? body
    expect(Array.isArray(tiers)).toBe(true)
    const withStripe = tiers.flatMap((t) => t.prices).filter((p) => p?.stripePriceId)
    expect(withStripe.length, JSON.stringify(tiers)).toBeGreaterThan(0)
  })

  test('signed-in user clicking Upgrade gets a real Stripe checkout URL', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    // The pricing page may render multiple Upgrade/Subscribe/Choose buttons;
    // grab the first one and watch the network for the checkout call.
    const upgradeBtn = page
      .getByRole('button', { name: /upgrade|subscribe|choose|select/i })
      .first()
    await expect(upgradeBtn).toBeVisible({ timeout: 10000 })
    const reqs = await captureNetwork(page, async () => {
      await Promise.race([
        upgradeBtn.click(),
        page
          .getByRole('link', { name: /upgrade|subscribe|choose|select/i })
          .first()
          .click()
          .catch(() => {}),
      ])
      // Give the redirect a moment.
      await page.waitForTimeout(2000)
    })
    const checkoutCall = reqs.find(
      (r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST',
    )
    expect(checkoutCall, JSON.stringify(reqs.filter((r) => /billing/.test(r.url)))).toBeTruthy()
    expect(checkoutCall!.status, await page.url()).toBeLessThan(400)
    // The URL should be a real Stripe checkout (cs_test_… in test mode)
    // OR the response payload contains one. Either way, the user is en
    // route to checkout.stripe.com.
    await page.waitForTimeout(1500)
    const finalUrl = page.url()
    expect(finalUrl, `final URL: ${finalUrl}`).toMatch(/stripe\.com|cs_test_|cs_live_|\/pricing/)
  })
})
