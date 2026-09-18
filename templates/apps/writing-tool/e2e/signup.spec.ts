/**
 * /signup — fresh writer onboarding.
 *
 * Asserts the form mounts, real signup creates a user (the auth client
 * sets an httpOnly token cookie), and redirects into /library.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('signup form renders', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading', { name: /create account/i }).first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('a fresh signup creates an authenticated session and lands in /library', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('versal-signup')
    await page.locator('input[autocomplete="name"]').fill('Versal Tester')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill('TestPass123!')
    await page.getByRole('button', { name: /create account/i }).click()
    await page.waitForURL(/\/library/, { timeout: 20_000 })
    const token = await getAccessToken(page)
    expect(token, 'auth cookie must be set after signup').toBeTruthy()
  })

  test('helper signup() round-trips and lands in /library', async ({ page }) => {
    await signup(page)
    await expect(page).toHaveURL(/\/library/)
  })
})
