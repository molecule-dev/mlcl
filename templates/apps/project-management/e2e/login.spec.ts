/**
 * /login — existing-user authentication. Verifies the login POST returns
 * a fresh JWT and the user is routed back into the app.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  getAccessToken,
  login,
  signOut,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('login page', () => {
  test('valid credentials log in and land on /dashboard with a token', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('login-ok')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    await context.clearCookies()
    await signOut(page)
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    await expect(page).toHaveURL(/\/dashboard/)
    const loginCall = reqs.find(
      (r) =>
        r.method === 'POST' && /\/api\/users\/(log-in|login|sessions|sign-in|signin)/.test(r.url),
    )
    expect(loginCall, 'POST login call').toBeTruthy()
    expect(loginCall?.status, 'login status code').toBeLessThan(400)
    const token = await getAccessToken(page)
    expect(token).toBeTruthy()
  })

  test('wrong password surfaces alert and stays on /login', async ({ page }) => {
    const email = uniqueEmail('login-bad')
    await signup(page, email, 'TestPass!1234')
    await signOut(page)
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('WrongPass!1234')
    // Wrong credentials are SUPPOSED to 403 — allow the browser's expected
    // console error before arming the submit.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.locator('form button[type="submit"]').first().click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('Forgot-password link → /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await page.waitForURL('**/forgot-password', { timeout: 5000 })
  })

  test('Sign-up link → /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /sign up/i })
      .first()
      .click()
    await page.waitForURL('**/signup', { timeout: 5000 })
  })
})
