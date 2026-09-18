import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, completeOnboarding, signup } from './_helpers.js'

test.describe('/recipes (Recipes)', () => {
  test('"New recipe" toggles the inline create form', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/recipes')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page
      .getByRole('button', { name: /new recipe/i })
      .first()
      .click()
    await expect(page.locator('input[type=text]').first()).toBeVisible()
  })

  test('Name input accepts text', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/recipes')
    await page
      .getByRole('button', { name: /new recipe/i })
      .first()
      .click()
    const inp = page.locator('input[type=text]').first()
    await inp.fill('Mediterranean Bowl')
    await expect(inp).toHaveValue('Mediterranean Bowl')
  })

  test('Create recipe persists and is visible after reload', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/recipes')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page
      .getByRole('button', { name: /new recipe/i })
      .first()
      .click()
    const recipeName = `My Bowl ${Date.now()}`
    await page.locator('input[type=text]').first().fill(recipeName)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /create recipe/i })
        .first()
        .click()
      await page.waitForTimeout(900)
    })
    const post = reqs.find((r) => /\/api\/meals($|\?)/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/meals fired').toBeTruthy()
    const meals = await api<Array<{ name: string }>>(page, 'GET', '/meals')
    expect(
      meals.find((m) => m.name === recipeName),
      'recipe persisted',
    ).toBeTruthy()
    await page.reload()
    await page.waitForTimeout(800)
    await expect(page.getByText(recipeName).first()).toBeVisible()
  })

  test('Recipe card navigates to /recipes/:id', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const created = await api<{ id: string; name: string }>(page, 'POST', '/meals', {
      name: `Card Nav ${Date.now()}`,
      items: [{ food_id: null, servings: 1, calories: 400, protein: 20, carbs: 40, fat: 10 }],
    })
    await page.goto(APP_BASE + '/recipes')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page.getByText(created.name).first().click()
    await expect(page).toHaveURL(new RegExp(`/recipes/${created.id}`))
  })

  test('"Add another recipe" tile re-opens the create form', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    // Ensure there is at least one recipe so the empty-state branch doesn't render
    await api(page, 'POST', '/meals', {
      name: `Tile Recipe ${Date.now()}`,
      items: [{ food_id: null, servings: 1, calories: 100, protein: 5, carbs: 5, fat: 1 }],
    })
    await page.goto(APP_BASE + '/recipes')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    // The tile is a <button> that opens the inline create form (setShowNewForm),
    // not a link — getByRole('link') matched nothing and the click timed out.
    await page
      .getByRole('button', { name: /add another recipe/i })
      .first()
      .click()
    await expect(page.locator('input[type=text]').first()).toBeVisible()
  })
})
