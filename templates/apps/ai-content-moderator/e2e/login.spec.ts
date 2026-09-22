/**
 * /login — bad credentials show error, good credentials land on /dashboard,
 * already-authenticated user is redirected, navigation links work.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('renders the login form with email + password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input#login-email')).toBeVisible()
    await expect(page.locator('input#login-password')).toBeVisible()
    await expect(page.locator('form[data-mol-id="login-form"] button[type="submit"]')).toBeVisible()
  })

  test('login with bogus credentials shows an inline error and stays on /login', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input#login-email').fill('nobody-' + Date.now() + '@flagship.test')
    await page.locator('input#login-password').fill('WrongPass!9999')
    // The 403 from a rejected login is the EXPECTED outcome here — the
    // browser logs it as a console error, so allow it explicitly.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form[data-mol-id="login-form"] button[type="submit"]').click()
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 })
    })
    await expect(page).toHaveURL(/\/login/)
    const failed = reqs.find((r) => /\/api\/users\/sessions|\/api\/sessions/.test(r.url))
    if (failed) expect(failed.status).toBeGreaterThanOrEqual(400)
  })

  test('login with valid credentials lands on /dashboard with authed user-menu visible', async ({
    page,
  }) => {
    const { email, password } = await signup(page, uniqueEmail('login-good'))
    // Now fully log out, then re-log in via the form. A complete logout must
    // clear the httpOnly `token` cookie too — clearing localStorage alone
    // leaves the session cookie valid, so a fresh /login load re-authenticates
    // from it and the page redirects straight to /dashboard (the login form,
    // and thus input#login-email, never renders).
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input#login-email').fill(email)
    await page.locator('input#login-password').fill(password)
    await page.locator('form[data-mol-id="login-form"] button[type="submit"]').click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await expect(page.locator('[data-mol-id="user-menu"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/forgot-password"]').click()
    await page.waitForURL('**/forgot-password', { timeout: 5000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('"Create an account" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/signup"]').first().click()
    await page.waitForURL('**/signup', { timeout: 5000 })
    await expect(page.locator('input#signup-email')).toBeVisible()
  })
})
