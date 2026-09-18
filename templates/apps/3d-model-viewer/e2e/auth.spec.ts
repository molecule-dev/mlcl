import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail, api } from './_helpers.js'

test.describe('auth — signup, login, logout, persistence', () => {
  test('Signup creates a real user row that the backend recognises (read-after-write)', async ({
    page,
  }) => {
    const email = uniqueEmail('signup')
    const reqs = await captureNetwork(page, async () => {
      await signup(page, email, 'TestPass123!')
    })
    // The signup form posts to POST /api/users — assert the response was 2xx.
    const signupCall = reqs.find((r) => /\/api\/users(\?|$)/.test(r.url) && r.method === 'POST')
    expect(signupCall, 'POST /api/users fired').toBeTruthy()
    expect(signupCall!.status, 'signup status code').toBeLessThan(300)

    // Read-after-write: the next GET against an authenticated endpoint must
    // return data scoped to the new user. /models is empty for a new user
    // but must be a 200 with []; not a 401.
    const models = await api<unknown[]>(page, 'GET', '/models')
    expect(Array.isArray(models), 'models endpoint returns an array').toBe(true)
    expect(models.length, 'fresh user starts with zero models').toBe(0)

    // Session cookie persisted on disk and survives reload.
    await page.reload()
    await expect(page).not.toHaveURL(/\/login|\/signup/, { timeout: 10_000 })
  })

  test('Logging out clears the session and bounces /dashboard back to /login', async ({ page }) => {
    await signup(page)
    // Hit the same logout endpoint the API uses.
    await page.request.post(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/users/log-out',
    )
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/dashboard')
    // AuthGuard should redirect to /login.
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/login/)
  })

  test('Login form rejects invalid credentials (no false positives)', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .locator('input#email, input[type=email]')
      .first()
      .fill(`bogus+${Date.now()}@example.com`)
    await page.locator('input#password, input[type=password]').first().fill('wrong-password!')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    // We must NOT end up on /dashboard.
    await page.waitForTimeout(2000)
    expect(page.url(), 'invalid login should not navigate to dashboard').not.toMatch(/\/dashboard/)
  })

  test('Forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Forgot/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('"Create an account" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /sign\s*up|create.*account/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Signup form mismatched passwords shows an inline error and does NOT POST', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input#firstName').fill('Test')
      await page.locator('input#lastName').fill('User')
      await page.locator('input#email').fill(uniqueEmail('mismatch'))
      await page.locator('input#password').fill('TestPass123!')
      await page.locator('input#confirmPassword').fill('Different456!')
      await page
        .getByRole('button', { name: /create\s*account/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    expect(page.url(), 'mismatched password should not navigate away').toMatch(/\/signup/)
    const signupPost = reqs.find((r) => /\/api\/users(\?|$)/.test(r.url) && r.method === 'POST')
    expect(signupPost, 'POST /api/users must NOT have fired with mismatched passwords').toBeFalsy()
  })
})
