/**
 * /login — existing-user authentication, password visibility toggle,
 * and forgot-password link.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, login, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('valid credentials log in and land on /dashboard with a token', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('login-ok')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    // sign out + clear storage so we exercise the login form for real
    await context.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    await expect(page).toHaveURL(/\/dashboard/)
    const loginCall = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(loginCall, 'POST login call').toBeTruthy()
    expect(loginCall?.status, 'login status code').toBeLessThan(400)
    const token = await getAccessToken(page)
    expect(token).toBeTruthy()
  })

  test('wrong password surfaces alert and does not navigate away', async ({ page }) => {
    // The 403 from POST /api/users/log-in IS the case under test.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: /status of 403/,
    })
    const email = uniqueEmail('login-bad')
    await signup(page, email, 'TestPass!1234')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input#login-email').fill(email)
    await page.locator('input#login-password').fill('WrongPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('show-password toggle flips input type', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('input#login-password')
    await pw.fill('secret')
    expect(await pw.getAttribute('type')).toBe('password')
    await page.getByRole('button', { name: /show password/i }).click()
    expect(await pw.getAttribute('type')).toBe('text')
    await page.getByRole('button', { name: /hide password/i }).click()
    expect(await pw.getAttribute('type')).toBe('password')
  })

  test('Forgot-password link → /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await page.waitForURL('**/forgot-password', { timeout: 5000 })
  })
})
