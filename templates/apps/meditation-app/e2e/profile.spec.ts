/**
 * /profile — identity + lifetime stats. Asserts the profile card, zero
 * stats for fresh accounts, achievements derived from real history, and
 * that the page actually fetches /api/stats/* + /api/history.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedHistory, signup } from './_helpers.js'

test.describe('profile (/profile)', () => {
  test('shows the display name for a fresh account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByTestId('profile-name')).toBeVisible({ timeout: 10000 })
  })

  test('lifetime sessions counter is 0 for a fresh account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByTestId('profile-sessions')).toContainText('0')
  })

  test('seeded history unlocks the first-session and deep-stillness achievements', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await seedHistory(page, accessToken, { durationSeconds: 1800 })
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByTestId('profile-achievement-first-session-earned')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByTestId('profile-achievement-deep-stillness-earned')).toBeVisible()
  })

  test('initial load hits /api/stats/streak, /api/stats/summary, /api/history and /api/preferences', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('networkidle')
    })
    const got = (path: string) =>
      reqs.some((r) => r.method === 'GET' && r.url.includes(path) && r.status < 400)
    expect(got('/api/stats/streak'), JSON.stringify(reqs.map((r) => r.url))).toBe(true)
    expect(got('/api/stats/summary')).toBe(true)
    expect(got('/api/history')).toBe(true)
    expect(got('/api/preferences')).toBe(true)
  })
})
