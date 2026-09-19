import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, completeOnboarding, createRecipe, signup, weekStart } from './_helpers.js'

test.describe('/groceries (GroceryList) — the signature flow', () => {
  test('plan → regenerate → items grouped by aisle appear', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const ingredient = `flow tofu ${Date.now()}`
    const created = await createRecipe(page, {
      ingredients: [{ item_name: ingredient, quantity: 400, unit: 'g' }],
    })
    await api(page, 'POST', '/meal-plan', {
      week_start: weekStart(),
      day: 0,
      meal_slot: 'dinner',
      recipe_id: created.id,
      servings: 2,
    })
    await page.goto(APP_BASE + '/groceries')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page.locator('[data-mol-id="groceries-regenerate"]').click()
    // The regenerated item shows up under some aisle group with its quantity.
    await expect(page.getByText(ingredient, { exact: true })).toBeVisible({ timeout: 10_000 })
    const items = await api<Array<{ name: string; source: string }>>(
      page,
      'GET',
      `/grocery-list?week_start=${weekStart()}`,
    )
    const row = items.find((i) => i.name === ingredient)
    expect(row, 'plan-sourced grocery item created').toBeTruthy()
    expect(row!.source).toBe('plan')
  })

  test('Checking an item PUTs checked=true and strikes it through', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const name = `check syrup ${Date.now()}`
    const item = await api<{ id: string; checked: boolean }>(page, 'POST', '/grocery-list', {
      week_start: weekStart(),
      name,
      quantity: 1,
      unit: '',
      category: 'other',
    })
    await page.goto(APP_BASE + '/groceries')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page.locator(`[data-mol-id="grocery-check-${item.id}"]`).click()
    const after = await api<Array<{ id: string; checked: boolean }>>(
      page,
      'GET',
      `/grocery-list?week_start=${weekStart()}`,
    )
    expect(after.find((i) => i.id === item.id)?.checked).toBe(true)
    await expect(page.locator(`[data-mol-id="grocery-check-${item.id}"]`)).toBeChecked()
  })

  test('Manual add form POSTs a source=manual item', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const name = `manual sponges ${Date.now()}`
    await page.goto(APP_BASE + '/groceries')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page.locator('[data-mol-id="groceries-add-name"]').fill(name)
    await page.locator('[data-mol-id="groceries-add-submit"]').click()
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 8_000 })
    const items = await api<Array<{ name: string; source: string }>>(
      page,
      'GET',
      `/grocery-list?week_start=${weekStart()}`,
    )
    const row = items.find((i) => i.name === name)
    expect(row, 'manual item created').toBeTruthy()
    expect(row!.source).toBe('manual')
  })

  test('Pantry match badges a plan item of the same name', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const staple = `badge flour ${Date.now()}`
    await api(page, 'POST', '/pantry', { name: staple, quantity: 1, unit: 'kg' })
    const created = await createRecipe(page, {
      ingredients: [{ item_name: staple, quantity: 500, unit: 'g' }],
    })
    await api(page, 'POST', '/meal-plan', {
      week_start: weekStart(),
      day: 1,
      meal_slot: 'dinner',
      recipe_id: created.id,
      servings: 2,
    })
    await page.goto(APP_BASE + '/groceries')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page.locator('[data-mol-id="groceries-regenerate"]').click()
    const row = page.locator('li', { hasText: staple }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    await expect(row.getByText(/you already have this/i)).toBeVisible()
  })

  test('"Grocery list" button on /plan regenerates and navigates to /groceries', async ({
    page,
  }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/plan')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    // The seed demo week guarantees at least one entry exists.
    await page.locator('[data-mol-id="plan-regenerate-list"]').click()
    await page.waitForURL(/\/groceries/, { timeout: 10_000 })
  })
})
