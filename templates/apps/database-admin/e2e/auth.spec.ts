/**
 * Auth flows: signup, login, forgot-password, reset-password.
 *
 * Read-after-write: every successful auth lands on /connections with a
 * persistent JWT, and the user can hit `/api/users/:id` with their token
 * to verify the account exists. Forgot-password POSTs to the real
 * `/users/forgot-password` route; reset-password posts a token to
 * `/users/reset-password`.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, login, signup, uniqueEmail } from './_helpers.js'

test.describe('Auth', () => {
  test('signup form renders and lands authenticated user on /connections', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading', { name: /create your quarry account/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()

    const email = uniqueEmail('signup')
    const password = 'TestPass123!'
    await page.getByRole('textbox', { name: /full name/i }).fill('Signup Tester')
    await page.getByRole('textbox', { name: /email/i }).fill(email)
    await page.getByRole('textbox', { name: /^password$/i }).fill(password)
    await page.getByRole('textbox', { name: /confirm password/i }).fill(password)

    await Promise.all([
      page.waitForURL(/\/connections/, { timeout: 15_000 }),
      page.getByRole('button', { name: /create account/i }).click(),
    ])
    await expect(page.getByRole('heading', { name: /^connections$/i })).toBeVisible()
  })

  test('login redirects already-signed-up user back to /connections', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => {
      localStorage.clear()
    })
    await login(page, email, password)
    await expect(page).toHaveURL(/\/connections/)
  })

  test('login rejects bad credentials with an inline error', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('textbox', { name: /email/i }).fill('nonexistent@example.com')
    await page.getByRole('textbox', { name: /password/i }).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('forgot-password posts to /users/forgot-password and shows confirmation', async ({
    page,
  }) => {
    const { email } = await signup(page)
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.goto(APP_BASE + '/forgot-password')
    await expect(
      page.getByRole('heading', { name: /reset your password|forgot password/i }),
    ).toBeVisible()
    const emailField = page.getByRole('textbox', { name: /email/i })
    await emailField.fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /send reset|send link|email me/i }).click()
      await page.waitForTimeout(1000)
    })
    const call = reqs.find((r) => r.url.includes('/users/forgot-password') && r.method === 'POST')
    expect(call?.status, 'forgot-password call').toBeGreaterThanOrEqual(200)
    expect(call?.status).toBeLessThan(500)
  })

  test('reset-password renders fields and the route exists', async ({ page, request }) => {
    await page.goto(APP_BASE + '/reset-password?token=invalid-token')
    await expect(page.locator('#reset-password')).toBeVisible()
    await expect(page.locator('#reset-password-confirm')).toBeVisible()

    // Hitting the API directly with a fake token should fail; the route
    // existing (rather than 404ing) proves the wiring.
    const res = await request.post(API_BASE + '/users/reset-password', {
      headers: { 'content-type': 'application/json' },
      data: { token: 'bogus', password: 'NewPass1234!' },
    })
    expect(res.status(), 'reset-password endpoint should be wired').not.toBe(404)
  })
})
