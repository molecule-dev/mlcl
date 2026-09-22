/**
 * /login — Public login form. POST /api/sessions and a session cookie /
 * bearer token combo lands the user on /dashboard.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup } from './_helpers.js'

test.describe('login page', () => {
  test('renders form, "Forgot?" inline link, and bottom signup link', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('form[data-mol-id="login-form"]')).toBeVisible()
    await expect(page.getByRole('link', { name: /Forgot/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Create a free workspace/ })).toBeVisible()
  })

  test('email + password inputs accept text', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input#login-email').fill('hello@studio.test')
    await page.locator('input#login-password').fill('TestPass!1234')
    await expect(page.locator('input#login-email')).toHaveValue('hello@studio.test')
    await expect(page.locator('input#login-password')).toHaveValue('TestPass!1234')
  })

  test('"Forgot?" link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Forgot/ }).click()
    await page.waitForURL('**/forgot-password', { timeout: 5000 })
  })

  test('"Create a free workspace" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Create a free workspace/ }).click()
    await page.waitForURL('**/signup', { timeout: 5000 })
  })

  test('submitting login with bad creds shows an alert (POST /api/users/log-in fails)', async ({
    page,
  }, testInfo) => {
    // Bad credentials 403 by design — the inline alert is the expectation.
    testInfo.annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.locator('input#login-email').fill('definitely-not-a-user@flagship.test')
      await page.locator('input#login-password').fill('WrongWrongWrong1!')
      await page.locator('form[data-mol-id="login-form"] button[type="submit"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(post).toBeTruthy()
    await expect(page).toHaveURL(/\/login/)
  })

  test('submitting login with valid creds redirects to /dashboard — POST /api/users/log-in hit', async ({
    page,
  }) => {
    const { email, password } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
      await page.waitForURL('**/dashboard', { timeout: 15000 })
    })
    const post = reqs.find(
      (r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST' && r.status < 400,
    )
    expect(post).toBeTruthy()
  })
})
