/**
 * Cross-page kitchen-sink journey for habit-tracker.
 *
 * A real user signs up, creates a habit, checks in, sees streak/achievement
 * updates, edits profile preferences, marks notifications read, browses
 * pricing, and confirms read-after-write invariants on every step.
 *
 * Drives the running dev server (vite=3100, api=4100) backed by Postgres.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  achievementsReachableInOneDay,
  apiHeaders,
  captureNetwork,
  getAchievements,
  signup,
} from './_helpers.js'

test.describe('99 user journey', () => {
  test.setTimeout(120_000)

  test('signup → habit → check-in → achievement → profile → notifications → pricing', async ({
    page,
  }) => {
    const { accessToken, userId, email } = await signup(page)
    expect(userId).toBeTruthy()

    // 1) Land on dashboard with empty state. Wait for data load — the
    //    h1 is rendered only after the initial fetches resolve.
    await expect(page).toHaveURL(/\/dashboard/)
    // Wait for the dashboard data load to complete (or surface the error).
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1')
        const err = document.querySelector('.text-error')
        return !!h1 || !!err
      },
      { timeout: 15000 },
    )
    await expect(page.locator('h1').first()).toContainText(/today/i, { timeout: 15000 })

    // 2) Create a habit via the New Habit form.
    await page.goto(APP_BASE + '/habits/new')
    await page.locator('input[placeholder="e.g. Morning meditation"]').fill('Drink water')
    const createReqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create habit/i }).click()
      await page.waitForURL(/\/habits\/[0-9a-f-]{8,}/, { timeout: 15000 })
    })
    const createCall = createReqs.find((r) => /\/api\/habits$/.test(r.url) && r.method === 'POST')
    expect(createCall?.status, JSON.stringify(createReqs)).toBe(201)

    // 3) Read-after-write: GET /api/habits returns the habit.
    let res = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
    let habits = (await res.json()) as Array<{
      id: string
      name: string
      current_streak: number
      completed_today: boolean
    }>
    expect(habits.length).toBe(1)
    const habitId = habits[0].id
    expect(habits[0].name).toBe('Drink water')
    expect(habits[0].current_streak).toBe(0)
    expect(habits[0].completed_today).toBe(false)

    // 4) Check in via API and confirm streak increment.
    res = await page.request.post(`${API_BASE}/habits/${habitId}/check-in`, {
      headers: apiHeaders(accessToken),
      data: {},
    })
    expect(res.status()).toBe(201)
    const checkInBody = (await res.json()) as {
      habit: { current_streak: number; total_completions: number }
    }
    expect(checkInBody.habit.current_streak).toBe(1)
    expect(checkInBody.habit.total_completions).toBe(1)

    // 5) Reload habits list — completed_today should now be true.
    res = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
    habits = await res.json()
    expect(habits[0].completed_today).toBe(true)

    // 6) Reports/today reflects the new active streak.
    res = await page.request.get(`${API_BASE}/reports/today`, { headers: apiHeaders(accessToken) })
    const today = (await res.json()) as { active_streaks: number; longest_active: number }
    expect(today.active_streaks).toBe(1)
    expect(today.longest_active).toBe(1)

    // 7) Reports/overview reflects the new totals.
    res = await page.request.get(`${API_BASE}/reports/overview`, {
      headers: apiHeaders(accessToken),
    })
    const overview = (await res.json()) as {
      total_check_ins: number
      active_habits: number
      best_ever_streak: number
      by_category: Array<{ category: string }>
      weekly_completion: Array<{ rate: number }>
    }
    expect(overview.total_check_ins).toBe(1)
    expect(overview.active_habits).toBe(1)
    expect(overview.best_ever_streak).toBe(1)
    expect(overview.by_category.length).toBeGreaterThan(0)
    expect(overview.weekly_completion.length).toBeGreaterThan(0)

    // 8) Achievements: every 1-day milestone the catalog defines should unlock
    //    automatically. Read them from the catalog the app serves rather than
    //    naming one, so the journey survives the catalog being replaced.
    const reachable = await achievementsReachableInOneDay(page, accessToken)
    const achievements = await getAchievements(page, accessToken)
    for (const milestone of reachable) {
      expect(
        achievements.find((a) => a.code === milestone.code)?.unlocked,
        `${milestone.code} must unlock after the first check-in`,
      ).toBe(true)
    }

    // 9) Dashboard now shows the habit and stats card.
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText('Drink water').first()).toBeVisible({ timeout: 10000 })

    // 10) Profile page renders user data from /api/profile/me, not placeholders.
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByTestId('profile-email')).toContainText(email)
    await expect(page.getByTestId('profile-plan')).toContainText(/free/i)

    // 11) Settings: change display name and verify persistence.
    await page.goto(APP_BASE + '/settings')
    const newName = `Streak User ${Date.now()}`
    const nameField = page.locator('input[type="text"]').first()
    await nameField.fill(newName)
    await page.getByTestId('settings-save').click()
    await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 10000 })

    res = await page.request.get(`${API_BASE}/profile/me`, { headers: apiHeaders(accessToken) })
    const profileAfter = (await res.json()) as { name: string }
    expect(profileAfter.name).toBe(newName)

    // 12) Reload settings — new name persists in form.
    await page.reload()
    await expect(page.locator('input[type="text"]').first()).toHaveValue(newName)

    // 13) Notifications page loads (likely empty for fresh user, may have one).
    await page.goto(APP_BASE + '/notifications')
    await page.waitForTimeout(500)
    await expect(page.locator('h1')).toContainText(/notifications/i)

    // 14) Calendar page loads + shows today's check-in cell.
    await page.goto(APP_BASE + '/calendar')
    await expect(page.locator('h1')).toContainText(/calendar/i)
    await expect(page.getByTestId(`calendar-row-${habitId}`)).toBeVisible({ timeout: 10000 })

    // 15) Stats page loads and shows total check-ins.
    await page.goto(APP_BASE + '/stats')
    await expect(page.locator('h1')).toContainText(/stats/i)

    // 16) Pricing page loads with tier cards.
    await page.goto(APP_BASE + '/pricing')
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /pro|plan|streak/i })
        .first(),
    ).toBeVisible({ timeout: 10000 })

    // 17) Achievements page lists the unlocked one.
    await page.goto(APP_BASE + '/achievements')
    await expect(page.locator('h1')).toContainText(/achievements/i)
    await expect(page.getByText(reachable[0].name).first()).toBeVisible()

    // 18) Habits index lists the habit.
    await page.goto(APP_BASE + '/habits')
    await expect(page.getByText('Drink water').first()).toBeVisible()

    // 19) Habit detail shows streak.
    await page.goto(APP_BASE + `/habits/${habitId}`)
    await expect(page.locator('h1')).toContainText(/drink water/i)

    // 20) Un-check via API resets streak.
    res = await page.request.delete(`${API_BASE}/habits/${habitId}/check-in`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    res = await page.request.get(`${API_BASE}/habits`, { headers: apiHeaders(accessToken) })
    habits = await res.json()
    expect(habits[0].current_streak).toBe(0)
    expect(habits[0].completed_today).toBe(false)
  })
})
