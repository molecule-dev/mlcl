/**
 * /login — public sign-in form.
 *
 * Asserts on real outcome: login persists a JWT and redirects to /dashboard.
 * Validates the show/hide-password toggle flips both aria-pressed and the
 * input type. Forgot/Sign-up links resolve to the right routes.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('renders Welcome back heading', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
  })

  test('email input accepts an address', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const email = page.getByLabel(/Email address/i)
    await email.fill('login@example.com')
    await expect(email).toHaveValue('login@example.com')
  })

  test('password input is masked and keeps the value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.getByLabel(/^Password$/i)
    await pw.fill('TestPass123!')
    await expect(pw).toHaveAttribute('type', 'password')
    await expect(pw).toHaveValue('TestPass123!')
  })

  test('Show password toggle flips type=password→text and aria-pressed', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.getByLabel(/^Password$/i)
    await pw.fill('TestPass123!')
    const toggle = page.getByRole('button', { name: /Show password/i })
    await toggle.click()
    await expect(pw).toHaveAttribute('type', 'text')
    await expect(page.getByRole('button', { name: /Hide password/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('Forgot link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Forgot/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('Sign in submits POST /api/users/log-in, persists JWT, navigates to /dashboard', async ({
    page,
  }) => {
    // First sign up so we have a real user, then log out and back in.
    const creds = await signup(page)
    await page.evaluate(() => localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/Email address/i).fill(creds.email)
    await page.getByLabel(/^Password$/i).fill(creds.password)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^Sign in$/i }).click()
      await page.waitForURL((u) => !String(u).includes('/login'), { timeout: 20000 })
    })
    const loginCall = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(loginCall?.status, 'log-in POST must succeed').toBeGreaterThanOrEqual(200)
    expect(loginCall?.status).toBeLessThan(300)
    await expect(page).toHaveURL(/\/dashboard/)
    const token = await getAccessToken(page)
    expect(token, 'JWT bearer token persisted in localStorage').toBeTruthy()
  })

  test('Bogus credentials show an error and keep the user on /login', async ({ page }) => {
    // The expected 403 from POST /api/users/log-in logs a benign
    // "Failed to load resource" console error, and the login page's own
    // structured logger mirrors the rejection (`login.submit I18nError…`).
    // Both are the expected invalid-credentials path — allow them explicitly.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403|login\\.submit',
    })
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/Email address/i).fill(uniqueEmail('nobody'))
    await page.getByLabel(/^Password$/i).fill('NotAPassword!')
    await page.getByRole('button', { name: /^Sign in$/i }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('Create an account link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Create an account/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
