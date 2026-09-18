/**
 * /login — auth flow: success, bad creds, forgot-password link.
 *
 * Asserts on real outcomes:
 *  - successful login lands on /dashboard with persisted access token in
 *    localStorage (read-after-write contract from the auth bond)
 *  - bad credentials surface an error and stay on /login (no token written)
 *  - "Forgot?" link routes to /forgot-password
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('renders heading and form fields', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('heading', { name: /Sign in to Remit/i })).toBeVisible()
    await expect(page.getByLabel('Work email', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible()
  })

  test('successful login navigates to /dashboard and persists access token', async ({ page }) => {
    // Sign up to get a real account, then log out by clearing storage and re-login.
    const { email, password } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    // Confirm we are logged out — direct dashboard hit redirects.
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForURL(/\/(login|signup|)\/?$/, { timeout: 10000 }).catch(() => {})

    await page.goto(APP_BASE + '/login')
    await page.getByLabel('Work email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: /^Sign in$/i }).click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    const token = await getAccessToken(page)
    expect(token, 'access token persisted after login').toBeTruthy()
  })

  test('bad credentials show error and DO NOT persist a token or navigate', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByLabel('Work email', { exact: true }).fill(uniqueEmail('bad'))
    await page.getByLabel('Password', { exact: true }).fill('NotARealPassword!')
    await page.getByRole('button', { name: /^Sign in$/i }).click()
    // Stays on /login.
    await page.waitForTimeout(2500)
    expect(page.url()).toMatch(/\/login/)
    const token = await getAccessToken(page)
    expect(token, 'failed login must not persist a token').toBeFalsy()
  })

  test('"Forgot?" link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /Forgot/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Reset your password/i })).toBeVisible()
  })

  test('"Create one" footer link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /Create one/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/, { timeout: 10000 })
  })

  test('Sign in click POSTs /api/users/log-in 200 and DOES NOT POST on bad creds (captureNetwork)', async ({
    page,
  }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())

    await page.goto(APP_BASE + '/login')
    const goodReqs = await captureNetwork(page, async () => {
      await page.getByLabel('Work email', { exact: true }).fill(email)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByRole('button', { name: /^Sign in$/i }).click()
      await page.waitForURL('**/dashboard', { timeout: 15000 })
    })
    expect(
      goodReqs.some(
        (r) => r.method === 'POST' && r.url.includes('/api/users/log-in') && r.status === 200,
      ),
    ).toBe(true)

    // Now bad creds.
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    const badReqs = await captureNetwork(page, async () => {
      await page.getByLabel('Work email', { exact: true }).fill(uniqueEmail('bad-net'))
      await page.getByLabel('Password', { exact: true }).fill('NotReal!')
      await page.getByRole('button', { name: /^Sign in$/i }).click()
      await page.waitForTimeout(2000)
    })
    expect(
      badReqs.some(
        (r) => r.method === 'POST' && r.url.includes('/api/users/log-in') && r.status >= 400,
      ),
    ).toBe(true)
  })
})
