/**
 * Night-detail page contract.
 *
 * - Real seeded log renders with the seeded score, duration, and notes
 * - A date with no data renders the not-found state
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, seedSleepLog, signup } from './_helpers.js'

test('seeded log renders with the seeded score and notes', async ({ page }) => {
  const { accessToken } = await signup(page)
  const today = new Date().toISOString().slice(0, 10)
  await seedSleepLog(page, accessToken, {
    sleep_date: today,
    quality_score: 91,
    duration_minutes: 510,
    notes: 'Magnesium and a long walk.',
  })
  await page.goto(APP_BASE + `/night/${today}`)
  await page.waitForLoadState('networkidle')

  await expect(page.getByText(/91 score/i).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Magnesium and a long walk/i)).toBeVisible()
  // Old hardcoded score "87" should not be present anywhere.
  await expect(page.getByText(/87 score/)).toHaveCount(0)
})

test('date with no log shows not-found state', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/night/1999-01-01')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('night-not-found')).toBeVisible({ timeout: 10_000 })
})
