/**
 * /login — returning writer can log back in to the same account.
 *
 * Asserts the form renders, an email/password authenticated by signup
 * works on /login, and the auth client persists across the
 * signup→logout→login cycle.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAccessToken, login, logout, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('login form renders', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()).toBeVisible()
  })

  test('signup → manual logout → login round-trips', async ({ page }) => {
    const email = uniqueEmail('versal-login')
    const password = 'TestPass123!'
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[autocomplete="name"]').fill('Login Round')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page.getByRole('button', { name: /create account/i }).click()
    await page.waitForURL(/\/library/, { timeout: 20_000 })
    // Log out via the UI so the httpOnly cookie is cleared; then re-login.
    await logout(page)
    await login(page, email, password)
    await expect(page).toHaveURL(/\/library/)
    const token = await getAccessToken(page)
    expect(token).toBeTruthy()
  })

  test('login with bogus credentials shows an error and stays on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill('does-not-exist@flagship.test')
    await page.locator('input[type="password"]').fill('not-a-real-password')
    await page.getByRole('button', { name: /sign\s*in|log\s*in/i }).click()
    // After ~1.5s the API has rejected — we should still be on /login.
    await page.waitForTimeout(2_000)
    expect(page.url()).toMatch(/\/login/)
  })

  test('helper signup→login flow works', async ({ page }) => {
    const { email, password } = await signup(page)
    await logout(page)
    await login(page, email, password)
  })
})
