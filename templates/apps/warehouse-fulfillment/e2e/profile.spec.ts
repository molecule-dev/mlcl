import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/profile saves operator details and survives reload', () => {
  test('editing display name + role + shift persists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByTestId('profile-page')).toBeVisible()
    await expect(page.getByTestId('profile-form')).toBeVisible()

    const newName = `E2E Operator ${Date.now().toString(36)}`
    const newRole = 'QA · Zone B'
    const newShift = '14:00 — 22:00'
    await page.getByTestId('profile-name').fill(newName)
    await page.getByTestId('profile-role').fill(newRole)
    await page.getByTestId('profile-shift').fill(newShift)
    await page.getByTestId('profile-save').click()
    await expect(page.getByTestId('profile-saved')).toBeVisible({ timeout: 8000 })

    // Header reflects the saved name immediately.
    await expect(page.getByTestId('profile-name-display')).toHaveText(newName)
    await expect(page.getByTestId('profile-role-display')).toHaveText(newRole)

    // Reload — values come back from the database.
    await page.reload()
    await expect(page.getByTestId('profile-form')).toBeVisible()
    await expect(page.getByTestId('profile-name')).toHaveValue(newName)
    await expect(page.getByTestId('profile-role')).toHaveValue(newRole)
    await expect(page.getByTestId('profile-shift')).toHaveValue(newShift)
  })
})
