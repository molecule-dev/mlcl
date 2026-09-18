import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/pricing page (page-level smoke)', () => {
  test('Pricing page renders a heading', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })

  test('Pricing page fetches /api/billing/tiers on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
    })
    const tiersCall = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(tiersCall, 'GET /api/billing/tiers').toBeTruthy()
    expect(tiersCall?.status).toBeLessThan(400)
  })

  test('Pricing page lists at least the Free tier copy', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const freeText = page.getByText(/free/i).first()
    await expect(freeText).toBeVisible({ timeout: 10000 })
  })
})
