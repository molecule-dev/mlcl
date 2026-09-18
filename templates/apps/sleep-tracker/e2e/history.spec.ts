/**
 * History page contract.
 *
 * - Empty state renders when the user has no logs
 * - After seeding logs via API, history rows appear and reflect API state
 * - Quality filter narrows the displayed list
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, seedSleepLog, signup } from './_helpers.js'

test('Empty state shows when the user has no logs', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/history')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('history-empty')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Apr 29|n_001|Travel night/i)).toHaveCount(0)
})

test('Seeded logs appear as history rows', async ({ page }) => {
  const { accessToken } = await signup(page)
  const today = new Date()
  const dates = [0, 1, 2].map((d) => {
    const x = new Date(today)
    x.setUTCDate(x.getUTCDate() - d)
    return x.toISOString().slice(0, 10)
  })
  for (const d of dates) {
    await seedSleepLog(page, accessToken, { sleep_date: d, quality_score: 80 })
  }
  await page.goto(APP_BASE + '/history')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/Showing 3 nights/i)).toBeVisible({ timeout: 10_000 })
})

test('Quality filter narrows the list', async ({ page }) => {
  const { accessToken } = await signup(page)
  const today = new Date()
  const days = [0, 1, 2, 3]
  const scores = [92, 75, 60, 40]
  for (let i = 0; i < days.length; i++) {
    const x = new Date(today)
    x.setUTCDate(x.getUTCDate() - days[i]!)
    await seedSleepLog(page, accessToken, {
      sleep_date: x.toISOString().slice(0, 10),
      quality_score: scores[i]!,
    })
  }
  await page.goto(APP_BASE + '/history')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/Showing 4 nights/i)).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: /^excellent$/i }).click()
  await expect(page.getByText(/Showing 1 nights/i)).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: /^poor$/i }).click()
  await expect(page.getByText(/Showing 1 nights/i)).toBeVisible({ timeout: 10_000 })
})
