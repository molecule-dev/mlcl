import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/leaderboard', () => {
  test('renders heading + tabs', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await expect(page.getByRole('heading', { name: /Leaderboard/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /friends/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /global/i })).toBeVisible()
  })

  test('weekly + all-time API calls fire', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/leaderboard')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const weekly = whereUrl(reqs, /\/api\/leaderboard\/weekly/, 'GET')
    const allTime = whereUrl(reqs, /\/api\/leaderboard\/all-time/, 'GET')
    expect(weekly.length, 'weekly API fired').toBeGreaterThan(0)
    expect(allTime.length, 'all-time API fired').toBeGreaterThan(0)
    expect(weekly[0].status, 'weekly status').toBe(200)
    expect(allTime[0].status, 'all-time status').toBe(200)
  })

  test('tab switching keeps the page on /leaderboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await page.getByRole('button', { name: /global/i }).click()
    await expect(page.getByRole('button', { name: /global/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
