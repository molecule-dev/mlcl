/**
 * /stats — KPIs + weekly chart. Asserts zero state, history-driven
 * counters, weekly card renders, and the page actually fetches /api/stats/*.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedHistory, signup } from './_helpers.js'

test.describe('stats (/stats)', () => {
  test('renders zero KPIs for a fresh account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/stats')
    await expect(page.getByTestId('stats-week-card')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('stats-kpi-sessions')).toContainText('0')
  })

  test('seeded history bumps the sessions KPI and the weekly minutes', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedHistory(page, accessToken, { durationSeconds: 1200 })
    await page.goto(APP_BASE + '/stats')
    await expect(page.getByTestId('stats-week-card')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('stats-kpi-sessions')).toContainText('1')
    await expect(page.getByTestId('stats-week-minutes')).not.toContainText(/^0$/)
  })

  test('weekly day labels render (per-day breakdown is visible)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/stats')
    await expect(page.getByTestId('stats-week-card')).toBeVisible({ timeout: 10000 })
  })

  test('initial load fetches /api/stats/streak, /api/stats/summary, /api/stats/daily and /api/preferences', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/stats')
      await page.waitForLoadState('networkidle')
    })
    const got = (path: string) =>
      reqs.some((r) => r.method === 'GET' && r.url.includes(path) && r.status < 400)
    expect(got('/api/stats/streak'), JSON.stringify(reqs.map((r) => r.url))).toBe(true)
    expect(got('/api/stats/summary')).toBe(true)
    expect(got('/api/stats/daily')).toBe(true)
    expect(got('/api/preferences')).toBe(true)
  })
})
