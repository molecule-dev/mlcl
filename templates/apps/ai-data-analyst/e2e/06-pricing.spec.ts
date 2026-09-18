import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers'

// /pricing — public marketing page; tier cards + CTAs from
// /api/billing/tiers.

test.describe('/pricing', () => {
  test('renders without auth', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
    })
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    // pricing page may or may not call /api/billing/tiers — both are fine,
    // just no 5xx allowed.
    expect(reqs.find((r) => r.status >= 500)).toBeUndefined()
  })

  test('contains at least one CTA link', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const links = await page.getByRole('link').count()
    expect(links).toBeGreaterThan(0)
  })

  test('renders at least one tier card or section', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    // Wait until the PricingPage component has rendered tier articles
    await page.locator('main article, main section').first().waitFor({ timeout: 10_000 })
    const sections = await page.locator('main section, main article').count()
    expect(sections).toBeGreaterThan(0)
  })
})
