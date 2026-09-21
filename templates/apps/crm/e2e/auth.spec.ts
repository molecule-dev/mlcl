import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  getAccessToken,
  login,
  logout,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('crm: auth', () => {
  test('signup creates an account, persists JWT, and lands on dashboard', async ({ page }) => {
    const session = await signup(page)
    expect(session.accessToken.length).toBeGreaterThan(20)
    expect(session.userId.length).toBeGreaterThan(20)
    // Landing page after signup is the dashboard at /, not /signup or /login.
    await expect(page).toHaveURL(APP_BASE + '/')
  })

  test('signup → logout → login round-trips with the same credentials', async ({ page }) => {
    const { email, password } = await signup(page)
    await logout(page)
    await login(page, email, password)
    await expect(page).toHaveURL(APP_BASE + '/')
    const stored = await getAccessToken(page)
    expect(stored).not.toBeNull()
  })

  test('login with bad credentials surfaces an error and stays on /login', async ({ page }) => {
    // The 403 from /api/users/log-in on bad credentials is the API working
    // correctly — allow the expected console noise before it fires.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page.goto(APP_BASE + '/login')
    await page.locator('#email, input[type="email"]').first().fill(uniqueEmail('bad'))
    await page.locator('#password, input[type="password"]').first().fill('wrong-password')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page.locator('[data-mol-id="login-error"]')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('forgot-password posts to /api/users/forgot-password (the canonical endpoint)', async ({
    page,
  }) => {
    const calls: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'POST') calls.push(req.url())
    })
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot'))
    await page
      .getByRole('button', { name: /send\s*reset|reset\s*link|send/i })
      .first()
      .click()
    await page.waitForTimeout(750)
    expect(calls.some((u) => u.includes('/api/users/forgot-password'))).toBe(true)
    // Must NOT hit the legacy /api/auth/* path that doesn't exist.
    expect(calls.some((u) => u.includes('/api/auth/forgot-password'))).toBe(false)
  })

  test('reset-password requires a token in the query string', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input[type="password"]').first().fill('NewPass123!')
    await page
      .getByRole('button', { name: /reset\s*password|update\s*password/i })
      .first()
      .click()
    await expect(page.locator('[data-mol-id="reset-error"]')).toBeVisible()
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('POST /api/users/reset-password is wired up (regression — was 404 before)', async ({
    page,
  }) => {
    // No token + no password should NOT be a 404. The route must exist and
    // surface a 4xx token-required error from the api-resource-user handler.
    const res = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: {},
      failOnStatusCode: false,
    })
    expect(res.status()).not.toBe(404)
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('protected routes redirect to /login when not authenticated', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/contacts')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
