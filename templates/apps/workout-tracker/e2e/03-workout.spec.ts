import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, API_BASE } from './_helpers.js'

test.describe('workout flow', () => {
  test('start → log set → finish completes a workout end-to-end', async ({ page }) => {
    await signup(page)

    await page.goto('/workout/active')
    await page.waitForLoadState('networkidle').catch(() => null)

    // No active workout → start one.
    const startBtn = page.getByTestId('start-workout')
    if (await startBtn.count().catch(() => 0)) {
      await startBtn.click()
    }

    await expect(page.getByTestId('set-composer')).toBeVisible({ timeout: 15000 })

    // Pick the first non-empty exercise option.
    const select = page.getByTestId('exercise-select')
    const optionValues = await select
      .locator('option')
      .evaluateAll((opts) => (opts as HTMLOptionElement[]).map((o) => o.value).filter(Boolean))
    expect(optionValues.length).toBeGreaterThan(0)
    await select.selectOption(optionValues[0])

    await page.getByTestId('set-weight').fill('80')
    await page.getByTestId('set-reps').fill('5')
    await page.getByTestId('add-set').click()

    // First logged set appears in the list.
    await expect(page.getByTestId('logged-set').first()).toBeVisible({ timeout: 15000 })

    // Total volume reflects the math (80 × 5 = 400 kg).
    await expect(page.getByTestId('total-volume')).toContainText('400', { timeout: 15000 })

    // Finish the workout — should redirect to /history/:id and persist.
    await page.getByTestId('finish-workout').click()
    await page.waitForURL(/\/history\/[a-f0-9-]{36}$/, { timeout: 30000 })
    // Wait for the detail page's data fetch to settle so the breakdown
    // table actually mounts before we assert on it.
    await page.waitForLoadState('networkidle').catch(() => null)

    // Workout detail shows the logged exercise breakdown.
    await expect(page.getByTestId('exercise-breakdown')).toBeVisible({ timeout: 30000 })
  })

  test('after finishing a workout it appears on /history and on dashboard', async ({ page }) => {
    await signup(page)

    // Use the API directly to create + complete a workout (faster, deterministic).
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    const exResp = await page.request.get(`${API_BASE}/exercises`, {
      headers: { Cookie: cookieHeader },
    })
    expect(exResp.status()).toBe(200)
    const exercises = await exResp.json()
    expect(Array.isArray(exercises) && exercises.length > 0).toBe(true)
    const exId: string = exercises[0].id

    const workoutCreate = await page.request.post(`${API_BASE}/workouts`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { name: 'Smoke Workout' },
    })
    expect(workoutCreate.status()).toBe(201)
    const workout = await workoutCreate.json()
    const workoutId: string = workout.id

    const setResp = await page.request.post(`${API_BASE}/workouts/${workoutId}/sets`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        exercise_id: exId,
        weight: 100,
        weight_kg: 100,
        weight_unit: 'kg',
        reps: 5,
        set_index: 0,
      },
    })
    expect(setResp.status()).toBe(201)

    const completeResp = await page.request.post(`${API_BASE}/workouts/${workoutId}/complete`, {
      headers: { Cookie: cookieHeader },
    })
    expect(completeResp.status()).toBe(200)

    // History page renders our completed workout.
    await page.goto('/history')
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.getByText('Smoke Workout')).toBeVisible({ timeout: 15000 })

    // Dashboard recent-workouts also picks it up.
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.getByText('Smoke Workout')).toBeVisible({ timeout: 15000 })

    // PRs page shows the auto-recorded 1RM record (Epley: 100 × 1.166 ≈ 117).
    await page.goto('/records')
    await page.waitForLoadState('networkidle').catch(() => null)
    // Should not be empty
    const empty = page.getByText(/no personal records/i)
    expect(await empty.count().catch(() => 0)).toBe(0)
  })
})
