import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  getAccessToken,
  login,
  signup,
  uniqueEmail,
  whereUrl,
} from './_helpers.js'

test.describe('/login', () => {
  test('renders the login form', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByLabel(/^Email( address)?$/i)).toBeVisible()
    await expect(page.getByLabel(/^Password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible()
  })

  test('signing in re-issues a JWT and lands inside the app', async ({ page, context }) => {
    const email = uniqueEmail('loginflow')
    await signup(page, email)
    // Clear storage so login is a real round-trip, not a residual session.
    await context.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, 'TestPass123!')
    })
    expect(
      whereUrl(reqs, /\/api\/users\/log-in/, 'POST').length,
      'POST /api/users/log-in fired',
    ).toBeGreaterThan(0)
    // [M1-1] The re-issued JWT lands in the httpOnly `token` cookie.
    const token = await getAccessToken(page)
    expect(token, 'JWT token in auth cookie after login').toBeTruthy()
    expect(token!.split('.').length, 'JWT shape').toBe(3)
  })

  test('wrong password keeps the user on /login', async ({ page }, testInfo) => {
    // Expected 4xx: the API rejects the bad credential (401/403) and the
    // page renders its inline error banner — the browser logs the failed
    // request, which the console guard must not treat as a regression.
    testInfo.annotations.push({
      type: 'allow-console-error',
      description: 'status of 40[134]',
    })
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/^Email( address)?$/i).fill('does-not-exist@example.com')
    await page.getByLabel(/^Password$/i).fill('NotARealPassword!')
    await page.getByRole('button', { name: /^Sign in$/i }).click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })
})
