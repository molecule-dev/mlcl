import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup, uniqueEmail } from './_helpers.js'

test.describe('/login (Login)', () => {
  test('email input accepts a typed value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const emailField = page.locator('input[type="email"]').first()
    await emailField.fill('typed@example.com')
    await expect(emailField).toHaveValue('typed@example.com')
  })

  test('password input is masked', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pwField = page.locator('input[type="password"]').first()
    await expect(pwField).toHaveAttribute('type', 'password')
  })

  test('valid credentials POST /api/users/login and navigate off /login (default → /dashboard)', async ({
    page,
  }) => {
    const email = uniqueEmail('login-spec')
    const password = 'TestPass123!'
    await signup(page, email, password)
    // After signup we are authenticated; sign out by clearing localStorage and re-login.
    await page.evaluate(() => window.localStorage.clear())

    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    expect(page.url()).toMatch(/\/dashboard/)
    const loginCall = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(loginCall, 'POST /api/users/log-in must be issued').toBeTruthy()
    expect(loginCall!.status).toBeLessThan(400)
  })

  test('Forgot password button navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('button', { name: /forgot|reset password/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 10_000 })
  })

  test('Sign up button navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('button', { name: /sign\s*up|create account/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
  })
})
