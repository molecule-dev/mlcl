import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  getAccessToken,
  login,
  logout,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/login page', () => {
  test('valid credentials log in and land on /dashboard with a token', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('login-ok')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    await context.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    await expect(page).toHaveURL(/\/dashboard/)
    const loginCall = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(loginCall, 'POST /api/users/log-in').toBeTruthy()
    expect(loginCall?.status).toBeLessThan(400)
    const token = await getAccessToken(page)
    expect(token).toBeTruthy()
  })

  test('wrong password surfaces alert and does not navigate away', async ({ page }) => {
    // A wrong password legitimately 403s on POST /api/users/log-in (the
    // browser logs the failed fetch before the alert renders).
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'Failed to load resource.*403',
    })
    const email = uniqueEmail('login-bad')
    await signup(page, email, 'TestPass!1234')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('WrongPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('show-password toggle flips input type', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('input[type="password"]').first()
    await pw.fill('secret')
    expect(await pw.getAttribute('type')).toBe('password')
    await page.getByRole('button', { name: /show password/i }).click()
    const pw2 = page.locator('input[autocomplete="current-password"]').first()
    expect(await pw2.getAttribute('type')).toBe('text')
  })

  test('Forgot link → /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/forgot-password"]').first().click()
    await page.waitForURL('**/forgot-password', { timeout: 5000 })
  })

  test('email + password fields preserve typed values', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill('demo@example.com')
    await page.locator('input[type="password"]').first().fill('hunter2')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('demo@example.com')
    expect(await page.locator('input[type="password"]').first().inputValue()).toBe('hunter2')
  })
})
