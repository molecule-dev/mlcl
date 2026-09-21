import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('auth flow', () => {
  test('signup persists access token, redirects off /signup, and survives reload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    expect(accessToken.length).toBeGreaterThan(20)
    expect(page.url()).not.toMatch(/\/signup/)
    // Persistence across reload — the AuthGuard must keep the user logged in.
    await page.goto(APP_BASE + '/dashboard')
    await page.reload()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /^dashboard$/i, level: 1 })).toBeVisible({
      timeout: 10000,
    })
  })

  test('AuthGuard redirects /dashboard to /login when not signed in', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('login after signup with the same credentials lands user on a protected page', async ({
    page,
  }) => {
    const email = uniqueEmail('login-roundtrip')
    const { password } = await signup(page, email)
    // Hard reset session.
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })
  })

  test('login with wrong password shows error and does not navigate away', async ({ page }) => {
    const email = uniqueEmail('badpw')
    await signup(page, email)
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('wrong-password')
    // The 403 on the failed login is the expected outcome under test.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.getByRole('button', { name: /sign in/i }).click()
    // We should still be on the login page, with an error.
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
  })
})
