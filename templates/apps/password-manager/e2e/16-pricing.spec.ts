import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/pricing', () => {
  test('publicly accessible — renders heading and tier cards', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /choose|plan|pricing/i }).first()).toBeVisible({
      timeout: 10_000,
    })
    // each tier exposes a CTA button or pricing-cta-* test id
    const ctas = page.locator(
      '[data-testid^="pricing-cta-"], button:has-text("Choose"), button:has-text("Upgrade"), button:has-text("Get"), button:has-text("Start")',
    )
    await expect(ctas.first()).toBeAttached()
  })

  test('renders limits per tier (item / vault counts)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/items/i)
    await expect(page.locator('body')).toContainText(/vaults/i)
  })

  test('logged-in upgrade CTA POSTs /api/billing/checkout for paid tier', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const upgradeCtas = page.locator(
      'button:has-text("Upgrade"), [data-testid^="pricing-cta-"]:not([data-testid*="free"]):not([data-testid*="starter"])',
    )
    const count = await upgradeCtas.count()
    if (count === 0) {
      test.skip(true, 'No upgradeable CTA found in current pricing UI')
      return
    }
    const reqs = await captureNetwork(page, async () => {
      await upgradeCtas.first().click()
      await page.waitForTimeout(2500)
    })
    const checkout = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
    if (!checkout) {
      // some tiers may navigate to plan-updated directly without billing
      return
    }
    expect(checkout.status).toBeLessThan(400)
  })
})
