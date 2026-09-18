import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { api, getMyUserId, signup } from './_helpers.js'

test.describe('settings', () => {
  test('profile field edits persist via PATCH /users/:id', async ({ page }) => {
    await signup(page, undefined, 'TestPass123!', 'Original', 'Name')
    await page.goto('/settings')
    await page.getByTestId('profile-form').waitFor()
    await page.getByLabel('Display name').fill('Edited Name')
    await page.getByTestId('save-profile').click()
    await expect(page.getByTestId('profile-saved')).toBeVisible({ timeout: 10_000 })

    const me = await api<{ name?: string }>(page, 'GET', `/users/${await getMyUserId(page)}`)
    expect(me.name).toBe('Edited Name')
  })

  test('display name input pre-fills with the signed-up name', async ({ page }) => {
    await signup(page, undefined, 'TestPass123!', 'Sammy', 'Smith')
    await page.goto('/settings')
    await expect(page.getByLabel('Display name')).toHaveValue('Sammy Smith')
  })
})
