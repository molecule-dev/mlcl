import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, login, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('landing page renders public CTAs', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: /start cutting|signup|sign up/i }).first(),
    ).toBeVisible()
  })

  test('signup → lands on dashboard', async ({ page }) => {
    await signup(page)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.locator('[data-mol-id="dashboard-new-project"]')).toBeVisible()
  })

  test('login with bad creds shows error and stays on /login', async ({ page }) => {
    // A rejected login is EXPECTED to 403 — the browser logs it, but the page
    // handles it by showing the inline error under the form.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(uniqueEmail('bad'))
    await page.locator('#password').fill('WrongPassword123!')
    await page.locator('[data-mol-id="login-submit"]').click()
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
    await expect(page.locator('[data-mol-id="login-error"]')).toBeVisible({ timeout: 5_000 })
  })

  test('login with valid creds navigates off /login', async ({ page }) => {
    const creds = await signup(page)
    // Sign out by clearing localStorage and re-logging in.
    await page.evaluate(() => window.localStorage.clear())
    await login(page, creds.email, creds.password)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('protected route redirects to /login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear()).catch(() => undefined)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('forgot password page renders', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })
})
