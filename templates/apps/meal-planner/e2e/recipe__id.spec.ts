import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, completeOnboarding, createRecipe, signup } from './_helpers.js'

test.describe('/recipes/:id (RecipeDetail)', () => {
  test('Ingredients, steps and meta render for a created recipe', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const created = await createRecipe(page, {
      ingredients: [
        { item_name: `detail noodles ${Date.now()}`, quantity: 200, unit: 'g' },
        { item_name: `detail broth ${Date.now()}`, quantity: 750, unit: 'ml' },
      ],
      steps: [{ text: 'Simmer the noodles in the broth.' }],
    })
    await page.goto(APP_BASE + `/recipes/${created.id}`)
    await expect(page.getByRole('heading', { level: 1, name: created.title })).toBeVisible()
    await expect(page.getByText('Simmer the noodles in the broth.')).toBeVisible()
    await expect(page.getByText(/min prep/).first()).toBeVisible()
  })

  test('Servings scaler rescales ingredient quantities', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const created = await createRecipe(page, {
      servings: 2,
      ingredients: [{ item_name: `scale rice ${Date.now()}`, quantity: 300, unit: 'g' }],
    })
    await page.goto(APP_BASE + `/recipes/${created.id}`)
    await expect(page.locator('[data-mol-id="scaler-servings"]')).toHaveText(/2 servings/)
    await expect(page.getByText('300 g').first()).toBeVisible()
    await page.locator('[data-mol-id="scaler-increase"]').click()
    await expect(page.locator('[data-mol-id="scaler-servings"]')).toHaveText(/3 servings/)
    await expect(page.getByText('450 g').first()).toBeVisible()
    await page.locator('[data-mol-id="scaler-decrease"]').click()
    await page.locator('[data-mol-id="scaler-decrease"]').click()
    await expect(page.locator('[data-mol-id="scaler-servings"]')).toHaveText(/1 servings/)
    await expect(page.getByText('150 g').first()).toBeVisible()
  })

  test('"Add to week" opens the recipe picker', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const created = await createRecipe(page)
    await page.goto(APP_BASE + `/recipes/${created.id}`)
    await page.locator('[data-mol-id="recipe-add-to-week"]').click()
    await expect(page.locator('[data-mol-id="picker-search"]')).toBeVisible()
    await page.locator('[data-mol-id="picker-close"]').click()
    await expect(page.locator('[data-mol-id="picker-search"]')).toHaveCount(0)
  })

  test('Unknown ids render the not-found state, not a crash', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/recipes/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText(/recipe not found/i)).toBeVisible()
  })
})
