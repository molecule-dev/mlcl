/**
 * /profile — renders /api/profile/me values (email, plan, member-since
 * date) plus aggregate stats from /api/reports/overview and a list of
 * unlocked achievements from /api/achievements.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  escapeRegExp,
  getAchievements,
  seedHabit,
  signup,
} from './_helpers.js'

test('profile page renders /api/profile/me email + plan', async ({ page }) => {
  const { email } = await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
  })

  expect(reqs.find((r) => /\/api\/profile\/me/.test(r.url))?.status).toBe(200)
  expect(reqs.find((r) => /\/api\/reports\/overview/.test(r.url))?.status).toBe(200)
  expect(reqs.find((r) => /\/api\/achievements/.test(r.url))?.status).toBe(200)

  await expect(page.getByTestId('profile-email')).toContainText(email)
  await expect(page.getByTestId('profile-plan')).toContainText(/free/i)
})

test('profile stats reflect a recorded check-in', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Stats card test')
  await page.request.post(`${API_BASE}/habits/${id}/check-in`, {
    headers: apiHeaders(accessToken),
    data: {},
  })

  await page.goto(APP_BASE + '/profile')
  await page.waitForLoadState('networkidle')
  // Active habits stat appears as "1" alongside its label.
  await expect(page.getByText(/active habits/i)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/check-ins/i).first()).toBeVisible()
})

test('manage subscription link points to /pricing', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile')
  const link = page.getByRole('link', { name: /manage subscription/i }).first()
  await expect(link).toBeVisible({ timeout: 10_000 })
  await link.click()
  await page.waitForURL(/\/pricing/, { timeout: 10_000 })
})

test('trophy case renders unlocked achievement name + tier from API row', async ({ page }) => {
  // Regression: Profile previously looked up trophies in a hardcoded
  // ACHIEVEMENT_META map keyed by codes that no longer matched the
  // catalog, so every unlocked achievement rendered as a generic 🏆 with
  // the row UUID. After fix, render the row's own name/icon/tier directly
  // — so this spec compares the card against the API row rather than
  // naming a milestone the starter catalog happens to carry.
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Trophy hunter')
  // The first check-in unlocks every milestone reachable with a 1-day streak.
  await page.request.post(`${API_BASE}/habits/${id}/check-in`, {
    headers: apiHeaders(accessToken),
    data: {},
  })
  const catalog = await getAchievements(page, accessToken)
  const unlocked = catalog.filter((a) => a.unlocked)
  expect(unlocked.length, 'a check-in must unlock at least one achievement').toBeGreaterThan(0)

  await page.goto(APP_BASE + '/profile')
  await page.waitForLoadState('networkidle')
  const trophy = page.getByTestId('profile-achievement').first()
  await expect(trophy).toBeVisible({ timeout: 10_000 })
  await expect(trophy).toContainText(new RegExp(escapeRegExp(unlocked[0].name), 'i'))
  await expect(trophy).toContainText(new RegExp(escapeRegExp(unlocked[0].tier), 'i'))
  // Achievement counter pip "<unlocked> / <catalog size>".
  await expect(
    page.getByText(new RegExp(`${unlocked.length}\\s*/\\s*${catalog.length}`)).first(),
  ).toBeVisible()
})

test('settings shortcut card navigates to /settings', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile')
  await page
    .getByRole('link', { name: /^settings/i })
    .first()
    .click()
  await page.waitForURL(/\/settings/, { timeout: 10_000 })
})

test('notifications shortcut card navigates to /notifications', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile')
  await page
    .getByRole('link', { name: /^notifications/i })
    .first()
    .click()
  await page.waitForURL(/\/notifications/, { timeout: 10_000 })
})
