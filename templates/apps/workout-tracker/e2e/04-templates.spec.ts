import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, API_BASE } from './_helpers.js'

test.describe('templates / routines', () => {
  test('empty state then create a template via UI; it persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto('/templates')
    await page.waitForLoadState('networkidle').catch(() => null)

    // Open the create form.
    await page
      .getByRole('button', { name: /new template|create template|new routine|create/i })
      .first()
      .click()

    const unique = `Smoke Template ${Date.now()}`
    const nameInput = page
      .getByRole('textbox', { name: /name|title/i })
      .or(page.locator('input[type="text"]').first())
      .first()
    await nameInput.fill(unique)
    await page
      .getByRole('button', { name: /create|save/i })
      .last()
      .click()

    // Either we land on the editor or we see the template in the list — accept both.
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(
      page
        .getByText(unique)
        .first()
        .or(page.getByRole('heading', { name: new RegExp(unique, 'i') }).first()),
    ).toBeVisible({ timeout: 15000 })

    await page.goto('/templates')
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.getByText(unique).first()).toBeVisible({ timeout: 15000 })
  })

  test('template editor adds an exercise and persists it', async ({ page }) => {
    await signup(page)

    // Seed a routine via the API for determinism.
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const create = await page.request.post(`${API_BASE}/routines`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { name: 'Editor Smoke', is_template: true },
    })
    expect(create.status()).toBe(201)
    const routine = await create.json()
    const routineId: string = routine.id

    await page.goto(`/templates/${routineId}/edit`)
    await page.waitForLoadState('networkidle').catch(() => null)

    const select = page.getByTestId('add-exercise-select')
    const optionValues = await select
      .locator('option')
      .evaluateAll((opts) => (opts as HTMLOptionElement[]).map((o) => o.value).filter(Boolean))
    expect(optionValues.length).toBeGreaterThan(0)
    await select.selectOption(optionValues[0])
    await page.getByTestId('add-exercise-sets').fill('4')
    await page.getByTestId('add-exercise-reps').fill('8')
    await page.getByTestId('add-exercise').click()

    await expect(page.getByTestId('exercise-list').locator('li')).toHaveCount(1, { timeout: 15000 })

    // Reload — exercise still there.
    await page.reload()
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.getByTestId('exercise-list').locator('li')).toHaveCount(1, { timeout: 15000 })
  })
})
