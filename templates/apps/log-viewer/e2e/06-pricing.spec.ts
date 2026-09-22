import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { gotoAndWait, APP_BASE, captureNetwork } from './_helpers'

// /pricing — public PricingPage from @molecule/app-billing-react.
// Fetches GET /api/billing/tiers to render plan cards + limits.

test.describe('/pricing', () => {
  test('renders without auth and pulls /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await gotoAndWait(page, APP_BASE + '/pricing', (r) => /\/api\/billing\/tiers/.test(r.url()))
    })
    const req = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(req, 'GET /api/billing/tiers should fire on /pricing').toBeDefined()
    expect(req!.status, 'tiers endpoint should respond 2xx').toBeLessThan(300)
  })

  test('"Open dashboard" link navigates to /dashboard', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page
      .getByRole('link', { name: /open dashboard|dashboard/i })
      .first()
      .click()
    // /dashboard is auth-protected → expect redirect to /login.
    await expect(page).toHaveURL(/\/(dashboard|login)/)
  })

  test('brand link returns to landing /', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const brand = page.locator('header').getByRole('link').first()
    await brand.click()
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/$/)
  })
})
