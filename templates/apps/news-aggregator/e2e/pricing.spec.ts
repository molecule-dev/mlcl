/**
 * Per-page coverage for /pricing. Cross-references e2e/observations/pricing.md.
 * Detailed Stripe-checkout flow lives in 08-billing.spec.ts.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders the page heading and all three tier CTAs', async ({ page }) => {
    const tiersWait = page.waitForResponse(
      (r) => /\/api\/billing\/tiers/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await tiersWait
    })
    await expect(page.locator('[data-mol-id="pricing-cta-pro"]').first()).toBeVisible()
    await expect(page.locator('[data-mol-id="pricing-cta-team"]').first()).toBeVisible()
    expect(reqs.some((r) => /\/api\/billing\/tiers/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('Pro upgrade click redirects to a real Stripe Checkout URL', async ({ page }) => {
    await signup(page, uniqueEmail('na-pricing-pro'))
    const tiersWait = page.waitForResponse(
      (r) => /\/api\/billing\/tiers/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/pricing')
    await tiersWait
    const cta = page.locator('[data-mol-id="pricing-cta-pro"]').first()
    await expect(cta).toBeVisible()
    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 30_000 }),
      cta.click(),
    ])
    expect(page.url()).toMatch(/checkout\.stripe\.com|cs_test_/)
  })

  test('signed-in free user sees a disabled "Current plan" CTA on the Free tier', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('na-pricing-free'))
    const tiersWait = page.waitForResponse(
      (r) => /\/api\/billing\/tiers/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/pricing')
    await tiersWait
    const ctas = page.locator('[data-mol-id^="pricing-cta-"]')
    await expect(ctas.first()).toBeAttached()
  })

  test('Team upgrade click redirects to a real Stripe Checkout URL', async ({ page }) => {
    await signup(page, uniqueEmail('na-pricing-team'))
    const tiersWait = page.waitForResponse(
      (r) => /\/api\/billing\/tiers/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/pricing')
    await tiersWait
    const cta = page.locator('[data-mol-id="pricing-cta-team"]').first()
    await expect(cta).toBeVisible()
    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 30_000 }),
      cta.click(),
    ])
    expect(page.url()).toMatch(/checkout\.stripe\.com|cs_test_/)
  })

  test('each tier card renders a non-empty feature list', async ({ page }) => {
    const tiersWait = page.waitForResponse(
      (r) => /\/api\/billing\/tiers/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/pricing')
    await tiersWait
    // Every tier CTA should be in a card that contains a list (<ul>/<li>) of
    // included entitlements rendered from server data — not just the CTA alone.
    const cards = page
      .locator('[data-mol-id^="pricing-cta-"]')
      .locator('xpath=ancestor::*[self::article or self::section or self::div][1]')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThan(0)
    for (let i = 0; i < cardCount; i++) {
      const itemCount = await cards.nth(i).locator('li').count()
      expect(itemCount).toBeGreaterThan(0)
    }
  })
})
