/**
 * /pricing — marketing pricing surface that pulls /api/billing/tiers
 * (no auth required). Renders the per-tier limits via the
 * pricing.limits.* i18n keys.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('pricing page', () => {
  test('renders heading without authentication', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15000 })
  })

  test('first paint fetches /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
    })
    const tiers = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.status === 200)
    expect(tiers, JSON.stringify(reqs.filter((r) => /billing/.test(r.url)))).toBeTruthy()
  })

  test('renders the three tier names + per-clip limits', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/pro/i).first()).toBeVisible()
    await expect(page.getByText(/team/i).first()).toBeVisible()
    await expect(page.getByText(/clips/i).first()).toBeVisible()
  })
})
