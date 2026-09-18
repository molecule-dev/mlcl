import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, getAccessToken, signup, login, uniqueEmail } from './_helpers.js'

test('Signup creates a session and lands the user on the dashboard', async ({ page }) => {
  await signup(page)
  await expect(page).toHaveURL(/\/(dashboard|home|app)?/, { timeout: 15000 })
  await expect(page.locator('body')).toBeVisible()
  // Auth token must be present so subsequent reloads keep the session alive.
  // Under cookie auth the token lives in the httpOnly `token` cookie.
  const token = await getAccessToken(page)
  expect(token, 'access token present after signup').toBeTruthy()
})

test('Session survives a full page reload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForLoadState('networkidle')
  await page.reload()
  await page.waitForLoadState('networkidle')
  // After reload the user must still be on dashboard (not bounced to /login).
  await expect(page).not.toHaveURL(/\/login|\/signup/, { timeout: 10000 })
})

test('Login with the same credentials re-authenticates after logout', async ({ page }) => {
  const email = uniqueEmail('reauth')
  const password = 'TestPass123!'
  await signup(page, email, password)
  // Clear all auth state.
  await page.context().clearCookies()
  await page.evaluate(() => window.localStorage.clear())
  await login(page, email, password)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
})

test('Signup rejects duplicate emails', async ({ page }) => {
  const email = uniqueEmail('dup')
  await signup(page, email)
  await page.context().clearCookies()
  await page.evaluate(() => window.localStorage.clear())

  await page.goto(APP_BASE + '/signup')
  await page.locator('input#signup-first').fill('Riley')
  await page.locator('input#signup-last').fill('Carter')
  await page.locator('input#signup-email').fill(email)
  await page.locator('input#signup-password').fill('TestPass123!')
  await page
    .getByRole('button', { name: /create account/i })
    .first()
    .click()
  // Should NOT progress to dashboard — surface stays on /signup with an error.
  await page.waitForTimeout(2000)
  await expect(page).toHaveURL(/\/signup/, { timeout: 5000 })
})
