import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, completeOnboarding, signup, todayDate } from './_helpers.js'

test.describe('/recipes/:id (RecipeDetail)', () => {
  async function makeRecipe(page: import('@playwright/test').Page) {
    await signup(page)
    await completeOnboarding(page)
    const created = await api<{ id: string; name: string; total_calories: number | string }>(
      page,
      'POST',
      '/meals',
      {
        name: `Burrito Bowl ${Date.now()}`,
        items: [{ food_id: null, servings: 1, calories: 700, protein: 30, carbs: 80, fat: 20 }],
      },
    )
    return created
  }

  test('Hero card shows the recipe name and total kcal', async ({ page }) => {
    const meal = await makeRecipe(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(`${APP_BASE}/recipes/${meal.id}`)
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const get = reqs.find((r) => r.url.includes(`/api/meals/${meal.id}`) && r.method === 'GET')
    expect(get).toBeTruthy()
    await expect(page.getByText(meal.name).first()).toBeVisible()
    await expect(page.getByText(/total kcal/i).first()).toBeVisible()
  })

  test('"Log to today" creates a diary entry whose food_name = recipe.name', async ({ page }) => {
    const meal = await makeRecipe(page)
    await page.goto(`${APP_BASE}/recipes/${meal.id}`)
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page
      .getByRole('button', { name: /log to today/i })
      .first()
      .click()
    await page.waitForTimeout(800)
    const diary = await api<{ entries: Array<{ food_name: string; calories: number | string }> }>(
      page,
      'GET',
      `/diary?date=${todayDate()}`,
    )
    const found = diary.entries.find((e) => e.food_name === meal.name)
    expect(found, `recipe ${meal.name} not in diary`).toBeTruthy()
    expect(Number(found!.calories)).toBeGreaterThan(0)
  })

  test('Back link navigates to /recipes', async ({ page }) => {
    const meal = await makeRecipe(page)
    await page.goto(`${APP_BASE}/recipes/${meal.id}`)
    await page
      .getByRole('button', { name: /back to recipes/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/recipes$/)
  })

  test('Ingredients aside shows either the items list or the empty-state text', async ({
    page,
  }) => {
    const meal = await makeRecipe(page)
    await page.goto(`${APP_BASE}/recipes/${meal.id}`)
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const ingredientsHeader = page.getByText(/ingredients/i).first()
    await expect(ingredientsHeader).toBeVisible()
    const empty = await page.getByText(/no ingredients/i).count()
    const rows = await page.locator('aside li').count()
    expect(empty + rows).toBeGreaterThan(0)
  })
})
