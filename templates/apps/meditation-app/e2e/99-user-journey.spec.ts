/**
 * The kitchen-sink journey: signup → start a session → record completion →
 * write a journal reflection → bump weekly goal → see KPIs reflect the
 * activity → see profile achievements unlock.
 *
 * If this passes, the core meditation-app loop works end-to-end.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, seedHistory, signup } from './_helpers.js'

test.describe('99 user journey', () => {
  test.setTimeout(120_000)

  test('signup → seed practice → reflect → settings → stats reflect everything', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await expect(page).toHaveURL(/\/home/)

    // 1) Seed a 25-minute practice via the API (mirrors what the player does
    //    when a session completes).
    await seedHistory(page, accessToken, { durationSeconds: 1500 })

    // 2) Save a journal reflection.
    const reflection = `Journey reflection ${Date.now()}`
    await page.goto(APP_BASE + '/journal')
    await page.getByTestId('journal-textarea').fill(reflection)
    await page.getByTestId('journal-mood-4').click()
    await page.getByTestId('journal-save').click()
    await expect(page.getByText(reflection)).toBeVisible({ timeout: 10000 })

    // 3) Bump the weekly goal in settings.
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-weekly-goal-180').click()
    await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 5000 })

    // 4) Stats page reflects the seeded session + new goal.
    await page.goto(APP_BASE + '/stats')
    await expect(page.getByTestId('stats-kpi-sessions')).toContainText('1', { timeout: 10000 })
    // The goal chip should now read "goal 180".
    await expect(page.getByTestId('stats-week-card')).toContainText('180')

    // 5) Profile shows "first breath" achievement earned.
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByTestId('profile-achievement-first-session-earned')).toBeVisible()

    // 6) Read-after-write invariants on the API side.
    const history = await page.request.get(`${API_BASE}/history`, {
      headers: apiHeaders(accessToken),
    })
    const historyRows = (await history.json()) as Array<unknown>
    expect(historyRows.length).toBeGreaterThanOrEqual(1)

    const journal = await page.request.get(`${API_BASE}/journal`, {
      headers: apiHeaders(accessToken),
    })
    const journalRows = (await journal.json()) as Array<{ body: string }>
    expect(journalRows.some((r) => r.body === reflection)).toBe(true)

    const prefs = await page.request.get(`${API_BASE}/preferences`, {
      headers: apiHeaders(accessToken),
    })
    const prefBody = (await prefs.json()) as { weekly_goal_minutes: number }
    expect(prefBody.weekly_goal_minutes).toBe(180)

    const summary = await page.request.get(`${API_BASE}/stats/summary`, {
      headers: apiHeaders(accessToken),
    })
    const sumBody = (await summary.json()) as { total_sessions: number; total_minutes: number }
    expect(sumBody.total_sessions).toBe(1)
    expect(sumBody.total_minutes).toBe(25)
  })
})
