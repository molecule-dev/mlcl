/**
 * Trends page contract.
 *
 * - Empty state renders when the user has no logs in the chosen window
 * - Period selector switches the window and triggers a fresh GET
 * - Real avg-duration / avg-score / total-nights are reflected after seeding
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, seedSleepLog, signup } from './_helpers.js'

test('Empty state when the user has no logs', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/trends')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('trends-empty')).toBeVisible({ timeout: 10_000 })
})

test('Seeded logs flow into the summary panel', async ({ page }) => {
  const { accessToken } = await signup(page)
  const today = new Date()
  for (const offset of [0, 1, 2, 3]) {
    const x = new Date(today)
    x.setUTCDate(x.getUTCDate() - offset)
    await seedSleepLog(page, accessToken, {
      sleep_date: x.toISOString().slice(0, 10),
      duration_minutes: 480,
      quality_score: 80,
    })
  }
  await page.goto(APP_BASE + '/trends')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/Total nights/i)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/^4$/).first()).toBeVisible()
  // avg duration ≈ 8.0h
  await expect(page.getByText(/8\.0h/).first()).toBeVisible()
})

test('Period buttons switch the active window (re-issues GET /stats/trends)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/trends')
  await page.waitForLoadState('networkidle')

  // Trigger a fresh request when switching to 7d
  const [req] = await Promise.all([
    page.waitForRequest((r) => /\/api\/stats\/trends\?days=7/.test(r.url()), { timeout: 10_000 }),
    page.getByRole('button', { name: /^7d$/i }).click(),
  ])
  expect(req.url()).toMatch(/days=7/)
})
