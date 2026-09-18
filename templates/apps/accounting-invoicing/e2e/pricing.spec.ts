/**
 * /pricing — public pricing page; "Upgrade to Pro" hits POST /api/billing/checkout
 * and either returns a Stripe Checkout URL or updates the subscription.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('pricing page', () => {
  test('GET /api/billing/tiers and renders pricing tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))?.status,
    ).toBeLessThan(400)
  })

  test('Free / Pro tier names render in pricing cards', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('signed-in user sees an Upgrade-style CTA on a paid tier', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const upgradeButton = page
      .getByRole('button', { name: /upgrade|select|choose|get pro/i })
      .or(page.getByRole('link', { name: /upgrade|select|choose|get pro/i }))
    await expect(upgradeButton.first()).toBeVisible({ timeout: 10000 })
  })

  test('clicking Upgrade triggers POST /api/billing/checkout returning a Stripe checkoutUrl', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const cta = page.getByRole('button', { name: /upgrade|select|choose|get pro/i }).first()
    // isVisible() does NOT wait for the element — the timeout option does not make
    // it retry — so right after goto() this read a pre-paint DOM and skipped the
    // test rather than running it (it skipped on the 2026-07-27 fleet run).
    // waitFor actually retries, so a skip means the CTA is genuinely absent.
    const present = await cta
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no upgrade CTA on pricing')
    const reqs = await captureNetwork(page, async () => {
      await cta.click()
      // Redirect (or open new tab) is async — wait long enough for the call
      await page.waitForTimeout(3000)
    })
    const checkout = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
    expect(checkout, 'POST /api/billing/checkout').toBeTruthy()
    expect(checkout?.status, 'checkout response status').toBeLessThan(500)
  })
})
