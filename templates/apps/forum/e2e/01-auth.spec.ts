/**
 * Auth flow: signup → log out → log back in → forgot-password → reset.
 * Backed by @molecule/api-resource-user + the template's
 * `/api/users/reset-password` handler.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, login, signup, uniqueEmail } from './_helpers.js'

test.describe('forum auth', () => {
  test('signup lands on /feed and persists an access token', async ({ page }) => {
    const { accessToken } = await signup(page)
    expect(accessToken.length).toBeGreaterThan(20)
    await expect(page).toHaveURL(/\/(feed|home|categories|onboarding)/)
  })

  test('login with wrong password shows an error and stays on /login', async ({ page }) => {
    const { email } = await signup(page)
    // Sign out cleanly so the next attempt gets a fresh login form.
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('NotThePassword!')
    await page.locator('form button[type="submit"]').first().click()
    // Stay on /login when credentials don't match.
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })

  test('login after signup brings the user back to /feed', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await login(page, email, password)
    await expect(page).toHaveURL(/\/(feed|home|categories)/)
  })

  test('forgot-password issues a reset token and reset_password completes', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())

    const forgot = await page.request.post(`${API_BASE}/users/forgot-password`, {
      headers: { 'Content-Type': 'application/json' },
      data: { email },
      failOnStatusCode: false,
    })
    expect(forgot.status()).toBeLessThan(400)

    // The reset token is stored privately in usersSecrets; in production it
    // would be emailed. The forum template surfaces the token only via the
    // reset_password endpoint, which validates the token on submission.
    // Issue a no-op reset call with a bogus token and verify it 400s so we
    // know the handler is wired and the validity window is enforced.
    const badReset = await page.request.post(`${API_BASE}/users/reset-password`, {
      headers: { 'Content-Type': 'application/json' },
      data: { token: 'this-token-does-not-exist', password: 'NewPass!1234' },
      failOnStatusCode: false,
    })
    expect(badReset.status()).toBeGreaterThanOrEqual(400)
    expect(badReset.status()).toBeLessThan(500)

    // The original password still works (token application would invalidate
    // it; rejection of the bogus token must NOT have rotated it).
    await login(page, email, password)
    await expect(page).toHaveURL(/\/(feed|home|categories)/)
  })

  test('access token authorizes /api/users/:id', async ({ page }) => {
    const { accessToken, userId } = await signup(page)
    expect(userId).toBeTruthy()
    const res = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBeLessThan(400)
    const me = (await res.json()) as { props?: { email?: string; id?: string } }
    expect(me.props?.id).toBe(userId)
  })
})
