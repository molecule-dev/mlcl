/**
 * /pricing — public tiers/plans page.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('pricing: at least the Free tier label is visible', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 10_000 })
})

test('pricing: page fetches /api/billing/tiers to render its plans', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers(\?|$)/.test(r.url)),
    'GET /api/billing/tiers must fire on /pricing',
  ).toBeTruthy()
})

test('pricing: at least one CTA / link is rendered', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await page.waitForLoadState('networkidle')
  const links = await page.getByRole('link').count()
  const buttons = await page.getByRole('button').count()
  expect(links + buttons).toBeGreaterThan(0)
})
