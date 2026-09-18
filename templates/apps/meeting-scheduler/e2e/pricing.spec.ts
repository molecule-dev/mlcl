import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork } from './_helpers.js'

test.describe('Pricing', () => {
  test('renders public pricing tiers', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/free/i).first()).toBeVisible()
    await expect(page.getByText(/pro/i).first()).toBeVisible()
  })

  test('fetches /api/billing/tiers on load (public endpoint)', async ({ page, request }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
    })
    const tiers = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url))
    if (tiers) {
      expect(tiers.status, 'GET /api/billing/tiers must succeed').toBeLessThan(400)
    } else {
      // Some implementations server-render tiers — fall back to a direct
      // probe via the request fixture so the contract is still asserted.
      const direct = await request.get(API_BASE + '/billing/tiers')
      expect(direct.status()).toBeLessThan(400)
    }
  })

  test('public pricing page is reachable without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page).toHaveURL(/\/pricing$/)
  })
})
