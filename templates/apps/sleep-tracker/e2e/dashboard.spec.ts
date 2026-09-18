/**
 * Dashboard page contract.
 *
 * - Loads after signup and renders the user's data
 * - Issues GET /api/sleep + GET /api/stats/overview on first load
 * - Reload preserves the authenticated state (no bounce to /login)
 * - The "All nights" CTA navigates to /history
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('dashboard renders heading + recent-nights section after signup', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')

  // Heading is dynamic ("Good morning — Saturday, May 9") — match the prefix
  await expect(
    page.getByRole('heading', { name: /good (morning|afternoon|evening)/i, level: 1 }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: /recent nights/i, level: 2 })).toBeVisible()
})

test('"All nights" link navigates to /history', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page
    .getByRole('link', { name: /all nights/i })
    .first()
    .click()
  await page.waitForURL(/\/history/, { timeout: 10_000 })
})

test('reload on /dashboard keeps the user on /dashboard', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/dashboard/)
})

test('Trends nav link from sidebar opens the Trends page', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page
    .getByRole('link', { name: /^trends$/i })
    .first()
    .click()
  await page.waitForURL(/\/trends/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/trends/)
})

test('Smart-alarm nav link from sidebar opens the alarm page', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page
    .getByRole('link', { name: /smart\s*alarm/i })
    .first()
    .click()
  await page.waitForURL(/\/alarm/, { timeout: 10_000 })
})

test('Settings nav link from sidebar opens the Settings page', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page
    .getByRole('link', { name: /^settings$/i })
    .first()
    .click()
  await page.waitForURL(/\/settings/, { timeout: 10_000 })
})

test('fresh user (no logs) sees an empty-state CTA — no fake "Apr 29" data', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForLoadState('networkidle')

  await expect(page.getByTestId('dashboard-empty')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('dashboard-recent-empty')).toBeVisible()
  await expect(page.getByText(/No nights tracked yet/i)).toBeVisible()
  // The old hardcoded fallback referenced 2026-04-29 / quality_score 87; should not show.
  await expect(page.getByText(/452\s*minutes/)).toHaveCount(0)
  await expect(page.getByText(/Apr 29/)).toHaveCount(0)
})
