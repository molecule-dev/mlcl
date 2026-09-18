import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers'

// /pricing — uses @molecule/app-billing-react PricingPage. Lists the
// configured pricing tiers from /api/billing/tiers and renders a
// renderLimits row per tier (API requests, rate limit, seats, advanced
// features). Public; no auth required.

test.describe('/pricing', () => {
  test('GET /api/billing/tiers fires on mount and returns 200', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.getByRole('heading', { name: /choose your.*plan/i }).waitFor({ timeout: 15_000 })
    })
    const tiersCall = reqs.find(
      (r) => /\/api\/billing\/tiers(\?|$)/.test(r.url) && r.method === 'GET',
    )
    expect(tiersCall, 'GET /api/billing/tiers should fire').toBeTruthy()
    expect(tiersCall!.status).toBe(200)
  })

  test('renderLimits row "API requests / month" appears at least once', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/API requests \/ month/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('at least one tier name (Free or Pro or Team or Enterprise) is rendered', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(
      page.getByText(/^(Free|Starter|Pro|Team|Business|Enterprise)$/i).first(),
    ).toBeVisible({ timeout: 15_000 })
  })
})
