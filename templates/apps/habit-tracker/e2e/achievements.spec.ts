/**
 * /achievements — fetches /api/achievements and displays unlock state.
 * After a check-in, every achievement reachable with a 1-day streak
 * unlocks (read-after-write).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  achievementsReachableInOneDay,
  apiHeaders,
  captureNetwork,
  getAchievements,
  seedHabit,
  signup,
} from './_helpers.js'

test('achievements page loads via /api/achievements', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/achievements')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.find((r) => /\/api\/achievements/.test(r.url))?.status).toBe(200)
  await expect(page.locator('h1')).toContainText(/achievements/i, { timeout: 10_000 })
})

test('first check-in unlocks every achievement reachable in one day', async ({ page }) => {
  const { accessToken } = await signup(page)
  // Read the milestones under test from the catalog the app serves — naming
  // one breaks this spec the moment the catalog is replaced.
  const reachable = await achievementsReachableInOneDay(page, accessToken)
  const { id } = await seedHabit(page, accessToken, 'First-step trigger')
  await page.request.post(`${API_BASE}/habits/${id}/check-in`, {
    headers: apiHeaders(accessToken),
    data: {},
  })

  const after = await getAchievements(page, accessToken)
  for (const milestone of reachable) {
    expect(
      after.find((a) => a.code === milestone.code)?.unlocked,
      `${milestone.code} (threshold ${milestone.threshold_days}d) must unlock on the first check-in`,
    ).toBe(true)
  }

  await page.goto(APP_BASE + '/achievements')
  await expect(page.getByText(reachable[0].name).first()).toBeVisible({ timeout: 10_000 })
})
