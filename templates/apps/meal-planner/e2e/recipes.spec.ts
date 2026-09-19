import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, completeOnboarding, createRecipe, signup } from './_helpers.js'

test.describe('/recipes (Recipe box)', () => {
  test('Recipe grid renders the shared catalog after first load', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/recipes')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const list = await api<Array<{ id: string }>>(page, 'GET', '/recipes')
    expect(list.length).toBeGreaterThan(0)
    // Every catalog recipe renders a card anchor.
    for (const row of list.slice(0, 3)) {
      await expect(page.locator(`[data-mol-id="recipe-card-${row.id}"]`)).toBeVisible()
    }
  })

  test('Search input filters the grid by title', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const created = await createRecipe(page)
    await page.goto(APP_BASE + '/recipes')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page.locator('[data-mol-id="recipes-search"]').fill(created.title)
    await expect(page.locator(`[data-mol-id="recipe-card-${created.id}"]`)).toBeVisible()
  })

  test('Time filter ≤ 20 min hides slower recipes', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const slow = await createRecipe(page, { prep_minutes: 30, cook_minutes: 40 })
    const quick = await createRecipe(page, { prep_minutes: 5, cook_minutes: 10 })
    await page.goto(APP_BASE + '/recipes')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page.locator('[data-mol-id="recipes-time-quick"]').click()
    await expect(page.locator(`[data-mol-id="recipe-card-${quick.id}"]`)).toBeVisible()
    await expect(page.locator(`[data-mol-id="recipe-card-${slow.id}"]`)).toHaveCount(0)
  })

  test('"New recipe" navigates to the create form', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/recipes')
    await page.locator('[data-mol-id="recipes-new"]').click()
    await expect(page).toHaveURL(/\/recipes\/new/)
    await expect(page.locator('[data-mol-id="recipe-form-title"]')).toBeVisible()
  })

  test('Recipe card navigates to /recipes/:id', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const created = await createRecipe(page)
    await page.goto(APP_BASE + '/recipes')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page.locator(`[data-mol-id="recipe-card-${created.id}"]`).click()
    await expect(page).toHaveURL(new RegExp(`/recipes/${created.id}$`))
  })
})
