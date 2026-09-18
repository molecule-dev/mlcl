import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAccessToken, login, signup, uniqueEmail } from './_helpers.js'

test.describe('Auth — signup, login, persistence', () => {
  test('signup creates a real user, persists access token, lands on dashboard', async ({
    page,
  }) => {
    const { accessToken, userId } = await signup(page)
    expect(accessToken).toBeTruthy()
    expect(userId).toBeTruthy()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('logging in an existing user resumes the session', async ({ page }) => {
    const email = uniqueEmail('iot-login')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    // Hard reload to fully clear state and prove login can reconstitute session.
    await page.evaluate(() => window.localStorage.clear())
    await login(page, email, password)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    const tokenAfterLogin = await getAccessToken(page)
    expect(tokenAfterLogin, 'login should persist a fresh access token').toBeTruthy()
  })

  test('AuthGuard redirects unauthenticated /dashboard back to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('access token survives a full page reload', async ({ page }) => {
    await signup(page)
    const before = await getAccessToken(page)
    await page.reload()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    const after = await getAccessToken(page)
    expect(after).toBe(before)
  })
})
