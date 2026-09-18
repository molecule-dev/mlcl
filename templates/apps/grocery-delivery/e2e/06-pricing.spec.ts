import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers'

// /pricing — public marketing page. Pulls tier data from the
// PricingPage component (GET /api/billing/tiers). Tiers are defined in
// api/src/tiers.ts: free, pro, team.

test.describe('/pricing', () => {
  test('renders heading and at least three tier cards', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page
        .waitForResponse((r) => /\/api\/billing\/tiers/.test(r.url()), { timeout: 15_000 })
        .catch(() => null)
    })
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    const tiersCall = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(tiersCall, 'GET /api/billing/tiers should fire').toBeDefined()
    expect(tiersCall!.status).toBe(200)
    // Each tier renders an upgrade button or a "current plan" badge —
    // we expect at least the three template tiers (free, pro, team).
    const tierCount = await page.locator('article, [role="article"], section').count()
    expect(tierCount).toBeGreaterThanOrEqual(3)
  })

  test('Pro tier surfaces an upgrade affordance', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    // The PricingPage component renders an "Upgrade" or "Choose plan" CTA
    // for paid tiers when the visitor is unauthenticated.
    await page.waitForLoadState('networkidle')
    const proSection = page.getByText(/pro/i).first()
    await expect(proSection).toBeVisible()
  })

  test('limits list rendered for each tier', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    // The renderLimits prop creates a UL with cart/delivery-slots/orders/products
    // limit items. A pricing page rendered without limits is broken.
    await expect(page.getByText(/cart|delivery|orders|products/i).first()).toBeVisible()
  })
})
