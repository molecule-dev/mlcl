import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, completeOnboarding, signup } from './_helpers.js'

test.describe('/recipes/new + /recipes/:id/edit (RecipeEdit)', () => {
  test('Create form saves a full recipe (ingredients + steps) via POST /api/recipes', async ({
    page,
  }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/recipes/new')
    const title = `Form Creation ${Date.now()}`
    await page.locator('[data-mol-id="recipe-form-title"]').fill(title)
    await page.locator('[data-mol-id="ingredient-name-0"]').fill(`form flour ${Date.now()}`)
    await page.locator('[data-mol-id="ingredient-quantity-0"]').fill('250')
    await page.locator('[data-mol-id="ingredient-unit-0"]').fill('g')
    await page.locator('[data-mol-id="ingredient-add"]').click()
    await page.locator('[data-mol-id="ingredient-name-1"]').fill(`form butter ${Date.now()}`)
    await page.locator('[data-mol-id="step-text-0"]').fill('Mix and bake.')
    await page.locator('[data-mol-id="recipe-form-save"]').click()
    await page.waitForURL(/\/recipes\/[0-9a-f-]+$/, { timeout: 10_000 })
    const list = await api<Array<{ id: string; title: string }>>(page, 'GET', '/recipes')
    const row = list.find((r) => r.title === title)
    expect(row, 'recipe persisted via the form').toBeTruthy()
    const detail = await api<{
      ingredients: Array<{ item_name: string }>
      steps: Array<{ text: string }>
    }>(page, 'GET', `/recipes/${row!.id}`)
    expect(detail.ingredients).toHaveLength(2)
    expect(detail.steps[0]?.text).toBe('Mix and bake.')
  })

  test('Edit form loads an owned recipe and saves a title change', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const created = await api<{ id: string }>(page, 'POST', '/recipes', {
      title: `Before Edit ${Date.now()}`,
      description: '',
      servings: 2,
      prep_minutes: 5,
      cook_minutes: 10,
      tags: ['spec'],
      image_emoji: '🍲',
      ingredients: [{ item_name: `edit egg ${Date.now()}`, quantity: 2, unit: '' }],
      steps: [],
    })
    await page.goto(APP_BASE + `/recipes/${created.id}/edit`)
    await expect(page.locator('[data-mol-id="recipe-form-title"]')).toHaveValue(/Before Edit/)
    const nextTitle = `After Edit ${Date.now()}`
    await page.locator('[data-mol-id="recipe-form-title"]').fill(nextTitle)
    await page.locator('[data-mol-id="recipe-form-save"]').click()
    await page.waitForURL(new RegExp(`/recipes/${created.id}$`), { timeout: 10_000 })
    const detail = await api<{ title: string }>(page, 'GET', `/recipes/${created.id}`)
    expect(detail.title).toBe(nextTitle)
  })
})
