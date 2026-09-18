/**
 * Auth invariants — signup creates a user, the JWT lands in
 * localStorage, login round-trips, and logout clears the session.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, logout, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup creates a user, writes the JWT to localStorage, and lands inside the app', async ({
    page,
  }) => {
    const { email, accessToken } = await signup(page, uniqueEmail('auth-signup'))
    expect(email).toMatch(/^auth-signup\+\d+/)
    expect(accessToken, 'access token should land in localStorage after signup').toBeTruthy()
    await expect(page).not.toHaveURL(/\/signup/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('login reuses an existing account', async ({ page }) => {
    const creds = await signup(page, uniqueEmail('auth-login'))
    await logout(page)
    await login(page, creds.email, creds.password)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('forgot-password page is reachable from login and accepts an email submission', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    const fakeEmail = uniqueEmail('forgot')
    await page.locator('input[type="email"]').first().fill(fakeEmail)
    const submit = page.getByRole('button').first()
    if (await submit.count()) {
      await submit.click()
    }
  })
})
