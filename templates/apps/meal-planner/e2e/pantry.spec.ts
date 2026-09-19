import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, completeOnboarding, signup } from './_helpers.js'

test.describe('/pantry (Pantry)', () => {
  test('Add form POSTs /api/pantry and the row appears', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const name = `stock vinegar ${Date.now()}`
    await page.goto(APP_BASE + '/pantry')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page.locator('[data-mol-id="pantry-add-name"]').fill(name)
    await page.locator('[data-mol-id="pantry-add-quantity"]').fill('2')
    await page.locator('[data-mol-id="pantry-add-unit"]').fill('bottles')
    await page.locator('[data-mol-id="pantry-add-submit"]').click()
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 8_000 })
    const items = await api<Array<{ name: string; quantity: number | string }>>(
      page,
      'GET',
      '/pantry',
    )
    const row = items.find((i) => i.name === name)
    expect(row, 'pantry item created').toBeTruthy()
    expect(Number(row!.quantity)).toBe(2)
  })

  test('Steppers adjust quantity through PUT /api/pantry/:id', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const created = await api<{ id: string }>(page, 'POST', '/pantry', {
      name: `step oats ${Date.now()}`,
      quantity: 3,
      unit: 'kg',
    })
    await page.goto(APP_BASE + '/pantry')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page.locator(`[data-mol-id="pantry-decrease-${created.id}"]`).click()
    const after = await api<Array<{ id: string; quantity: number | string }>>(
      page,
      'GET',
      '/pantry',
    )
    expect(Number(after.find((i) => i.id === created.id)?.quantity)).toBe(2)
  })

  test('Search narrows the pantry list', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    const needle = `needle saffron ${Date.now()}`
    await api(page, 'POST', '/pantry', { name: needle, quantity: 1, unit: 'jar' })
    await page.goto(APP_BASE + '/pantry')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page.locator('[data-mol-id="pantry-search"]').fill(needle)
    await expect(page.getByText(needle, { exact: true }).first()).toBeVisible()
    // Seeded staples disappear under the filter.
    // Rows that do not match the filter disappear: fetch a second pantry
    // row from the API and assert it is gone from the filtered view.
    const other = await api<Array<{ id: string; name: string }>>(page, 'GET', '/pantry')
    const unrelated = other.find((i) => i.name !== needle)
    if (unrelated) {
      await expect(page.getByText(unrelated.name, { exact: true })).toHaveCount(0)
    }
  })
})
