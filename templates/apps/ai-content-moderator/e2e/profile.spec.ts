/**
 * /profile — name + email round-trip; preferences (role/timezone/
 * notification channels) persist via localStorage.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('profile page', () => {
  test('renders prefilled with the signed-in user data', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('#profile-email')).toHaveValue(email)
    await expect(page.locator('#profile-name')).toHaveValue('Test User')
  })

  test('saving a new name persists across reload (PATCH /api/users/:id then localStorage cache)', async ({
    page,
  }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    const newName = `Renamed ${Date.now()}`
    await page.locator('#profile-name').fill(newName)

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save changes/i }).click()
      await expect(page.locator('text=/profile saved/i')).toBeVisible({ timeout: 5000 })
    })
    const patch = reqs.find((r) => /\/api\/users\//.test(r.url) && r.method === 'PATCH')
    expect(patch?.status, JSON.stringify(reqs)).toBe(200)

    await page.reload()
    await expect(page.locator('#profile-name')).toHaveValue(newName)
    await expect(page.locator('#profile-email')).toHaveValue(email)
  })

  test('timezone preference persists across reload (localStorage)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('#profile-tz').selectOption('Europe/Berlin')
    await page.reload()
    await expect(page.locator('#profile-tz')).toHaveValue('Europe/Berlin')
  })

  test('role preference persists across reload (localStorage)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('#profile-role').selectOption('Senior moderator')
    await page.reload()
    await expect(page.locator('#profile-role')).toHaveValue('Senior moderator')
  })
})
