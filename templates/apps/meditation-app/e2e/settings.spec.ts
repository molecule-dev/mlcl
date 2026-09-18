/**
 * /settings — preferences round-trip. Each test edits a different field
 * and asserts the change persists in /api/preferences.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('settings (/settings)', () => {
  test('initial load fetches /api/preferences', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle')
    })
    const gets = reqs.filter((r) => r.method === 'GET' && r.url.includes('/api/preferences'))
    expect(gets.length, JSON.stringify(reqs.map((r) => r.url))).toBeGreaterThan(0)
    expect(gets[0].status).toBeLessThan(400)
  })

  test('changing the voice persists via PUT /api/preferences', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-voice-saoirse').click()
    await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 5000 })

    const r = await page.request.get(`${API_BASE}/preferences`, {
      headers: apiHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as { voice: string }
    expect(body.voice).toBe('saoirse')
  })

  test('changing the weekly goal persists via PUT /api/preferences', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-weekly-goal-180').click()
    await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 5000 })

    const r = await page.request.get(`${API_BASE}/preferences`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await r.json()) as { weekly_goal_minutes: number }
    expect(body.weekly_goal_minutes).toBe(180)
  })

  test('toggling autoplay persists via PUT /api/preferences', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-autoplay').check()
    await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 5000 })

    const r = await page.request.get(`${API_BASE}/preferences`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await r.json()) as { autoplay_next: boolean }
    expect(body.autoplay_next).toBe(true)
  })
})
