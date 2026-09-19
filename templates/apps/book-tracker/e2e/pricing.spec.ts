/**
 * /pricing — public page rendered by @molecule/app-billing-react. Shows
 * the configured tiers with their per-app limits (reviews, books,
 * stats, advanced, export).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('pricing page renders the heading', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await page.waitForLoadState('networkidle')
  await expect(
    page
      .locator('h1, h2')
      .filter({ hasText: /plan|pagebound|pricing/i })
      .first(),
  ).toBeVisible({
    timeout: 10_000,
  })
})

test('pricing page lists per-tier limits (reviews, books, history)', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await page.waitForLoadState('networkidle')
  // The renderLimits ul includes "reviews", "books", "-day history", and the export/advanced rows.
  await expect(page.getByText(/entries/i).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/books/i).first()).toBeVisible()
  await expect(page.getByText(/stats/i).first()).toBeVisible()
})

test('pricing page is reachable while logged out', async ({ page }) => {
  // Public — no auth required.
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
  })
  // Should not have any 401s blocking the render.
  const auth401 = reqs.find((r) => r.status === 401 && /\/api\//.test(r.url))
  expect(auth401, JSON.stringify(reqs)).toBeFalsy()
})
