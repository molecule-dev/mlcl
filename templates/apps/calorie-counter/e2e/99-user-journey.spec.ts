import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, completeOnboarding, num, signup, todayDate } from './_helpers.js'

/**
 * Kitchen-sink journey for the calorie-counter (Nosh) app.
 *
 *   sign up → onboarding → log a verified food → quick-add water →
 *   raise calorie goal → create a recipe → log it → record a weight →
 *   flip a notification preference → sign out.
 *
 * Each phase asserts the persisted state via the API so this spec also
 * acts as a smoke test that every primary feature is wired end-to-end.
 */
test.describe('user journey — calorie-counter end-to-end', () => {
  test('owner walks every primary surface and the persisted state lines up', async ({ page }) => {
    test.setTimeout(180_000)

    // Phase 1 — fresh account + onboarding finalises goals.
    await signup(page)
    await completeOnboarding(page)
    await expect(page).toHaveURL(/\/today/)

    const initialGoals = await api<{ calories: number | string; protein: number | string }>(
      page,
      'GET',
      '/goals',
    )
    expect(num(initialGoals.calories)).toBeGreaterThan(1500)

    // Phase 2 — log a verified food via /log.
    const foods = await api<Array<{ id: string; name: string; calories: number | string }>>(
      page,
      'GET',
      '/foods?limit=1&is_verified=true',
    )
    expect(foods.length).toBeGreaterThan(0)
    const food = foods[0]

    await page.goto(`${APP_BASE}/log`)
    await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {})
    await page.getByRole('button', { name: /^Add /i }).first().click()
    await page.waitForTimeout(800)

    let diary = await api<{ entries: Array<{ food_name: string }>; totals: { calories: number } }>(
      page,
      'GET',
      `/diary?date=${todayDate()}`,
    )
    expect(diary.entries.find((e) => e.food_name === food.name)).toBeTruthy()

    // Phase 3 — quick-add water from /today, then verify count grew.
    await page.goto(`${APP_BASE}/today`)
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const waterBefore = (
      (await page.locator('[data-testid="water-count"]').textContent()) ?? ''
    ).trim()
    await page.locator('[data-testid="water-add-button"]').click()
    await page.waitForTimeout(800)
    const waterAfter = (
      (await page.locator('[data-testid="water-count"]').textContent()) ?? ''
    ).trim()
    expect(waterAfter).not.toEqual(waterBefore)

    // Phase 4 — raise the calorie goal and confirm persistence.
    await page.goto(`${APP_BASE}/goals`)
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page
      .getByRole('button', { name: /^\s*Raise/i })
      .first()
      .click()
    await page.waitForTimeout(800)
    const raised = await api<{ calories: number | string }>(page, 'GET', '/goals')
    expect(num(raised.calories)).toBeGreaterThan(num(initialGoals.calories))

    // Phase 5 — create a recipe via the UI and confirm it's listed.
    const recipeName = `Journey Bowl ${Date.now()}`
    await page.goto(`${APP_BASE}/recipes`)
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page
      .getByRole('button', { name: /new recipe/i })
      .first()
      .click()
    await page.locator('input[type=text]').first().fill(recipeName)
    await page
      .getByRole('button', { name: /create recipe/i })
      .first()
      .click()
    await page.waitForTimeout(900)
    const meals = await api<Array<{ id: string; name: string }>>(page, 'GET', '/meals')
    const created = meals.find((m) => m.name === recipeName)
    expect(created).toBeTruthy()

    // Phase 6 — log that recipe to today and confirm a new diary entry exists.
    await page.goto(`${APP_BASE}/recipes/${created!.id}`)
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page
      .getByRole('button', { name: /log to today/i })
      .first()
      .click()
    await page.waitForTimeout(900)
    diary = await api<{ entries: Array<{ food_name: string }>; totals: { calories: number } }>(
      page,
      'GET',
      `/diary?date=${todayDate()}`,
    )
    expect(diary.entries.find((e) => e.food_name === recipeName)).toBeTruthy()

    // Phase 7 — record a weight via /weight and confirm the API reflects it.
    await page.goto(`${APP_BASE}/weight`)
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page
      .getByRole('button', { name: /log weight/i })
      .first()
      .click()
    await page.locator('input[type=number]').first().fill('170.5')
    await page
      .getByRole('button', { name: /^Save$/i })
      .first()
      .click()
    await page.waitForTimeout(900)
    const weights = await api<Array<{ weight_kg: number | string }>>(
      page,
      'GET',
      '/weight?limit=12',
    )
    expect(weights.length).toBeGreaterThan(0)

    // Phase 8 — flip a notification toggle in /settings and verify persistence.
    await page.goto(`${APP_BASE}/settings`)
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const prefsBefore = await api<{ streak?: boolean }>(page, 'GET', '/notification-preferences')
    await page.locator('label:has(input[aria-label="Streak alerts"])').click()
    await page.waitForTimeout(700)
    const prefsAfter = await api<{ streak?: boolean }>(page, 'GET', '/notification-preferences')
    expect(Boolean(prefsAfter.streak)).not.toEqual(Boolean(prefsBefore.streak))

    // Phase 9 — sign out and confirm that /today redirects back to /login.
    await page
      .getByRole('button', { name: /sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 8_000 })
    await page.goto(`${APP_BASE}/today`)
    await page.waitForTimeout(800)
    expect(page.url()).toMatch(/\/login/)
  })
})
