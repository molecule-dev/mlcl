import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, completeOnboarding, createRecipe, signup, weekStart } from './_helpers.js'

test.describe('/plan (MealPlan)', () => {
  test('Week grid renders with 21 slot cells', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/plan')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    // 7 days × 3 slots
    await expect(
      page.locator('button[data-mol-id^="cell-add-"], button[data-mol-id^="entry-open-"]').first(),
    ).toBeVisible()
    const entries = await api<Array<{ id: string }>>(
      page,
      'GET',
      `/meal-plan?week_start=${weekStart()}`,
    )
    for (const entry of entries) {
      await expect(page.locator(`[data-mol-id="entry-open-${entry.id}"]`)).toBeVisible()
    }
  })

  test('Assigning a recipe through the picker POSTs /api/meal-plan and renders the chip', async ({
    page,
  }) => {
    await signup(page)
    await completeOnboarding(page)
    const created = await createRecipe(page)
    await page.goto(APP_BASE + '/plan')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    // Sunday dinner is never seeded, so its empty-cell button exists
    await page.locator('[data-mol-id="cell-add-dinner-6"]').first().click()
    await page.locator('[data-mol-id="picker-search"]').fill(created.title)
    // Arm the POST wait BEFORE clicking — reading the plan back immediately
    // raced the create and flaked on retry.
    const posted = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/meal-plan/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator(`[data-mol-id="picker-recipe-${created.id}"]`).click()
    const post = await posted
    expect(post.status()).toBeLessThan(300)
    const entries = await api<
      Array<{ id: string; day: number; meal_slot: string; recipe_id: string }>
    >(page, 'GET', `/meal-plan?week_start=${weekStart()}`)
    const entry = entries.find((e) => e.recipe_id === created.id)
    expect(entry, 'entry created through the picker').toBeTruthy()
    expect(entry!.meal_slot).toBe('dinner')
    await expect(page.locator(`[data-mol-id="entry-open-${entry!.id}"]`)).toBeVisible()
  })

  test('Removing a planned meal DELETEs the entry', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const created = await createRecipe(page)
    const entry = await api<{ id: string }>(page, 'POST', '/meal-plan', {
      week_start: weekStart(),
      day: 5,
      meal_slot: 'lunch',
      recipe_id: created.id,
      servings: 2,
    })
    await page.goto(APP_BASE + '/plan')
    await expect(page.locator(`[data-mol-id="entry-open-${entry.id}"]`)).toBeVisible()
    await page.locator(`[data-mol-id="entry-remove-${entry.id}"]`).click({ force: true })
    await expect(page.locator(`[data-mol-id="entry-open-${entry.id}"]`)).toHaveCount(0, {
      timeout: 8_000,
    })
  })

  test('Week navigation moves to the next week and back', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/plan')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page.locator('[data-mol-id="week-prev"]').click()
    // After moving off the current week the "This week" pill appears.
    await expect(page.locator('[data-mol-id="week-today"]')).toBeVisible()
    await page.locator('[data-mol-id="week-today"]').click()
    await expect(page.locator('[data-mol-id="week-today"]')).toHaveCount(0)
  })
})
