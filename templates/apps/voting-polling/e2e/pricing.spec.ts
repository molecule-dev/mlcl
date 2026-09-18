import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('/pricing renders the Free tier card', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByText(/free/i).first()).toBeVisible()
})

test('/pricing renders the Pro tier card', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByText(/pro/i).first()).toBeVisible()
})

test('/pricing renders the Team tier card', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByText(/team/i).first()).toBeVisible()
})

test('/pricing exposes per-tier CTA buttons (one per paid tier, plus a "Current plan" on free)', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/pricing')
  // PricingPage from @molecule/app-billing-react renders one button per
  // tier with `data-mol-id="pricing-cta-<tier-key>"` — Upgrade to Pro /
  // Upgrade to Team / Current plan (for free).
  await expect(page.locator('[data-mol-id="pricing-cta-free"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="pricing-cta-pro"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="pricing-cta-team"]')).toBeVisible()
})

test('observation invariant: /pricing fires GET /api/billing/tiers on page load', async ({
  page,
}) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')).toBeTruthy()
})
