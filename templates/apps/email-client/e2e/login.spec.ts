/**
 * Per-page spec for /login (Login).
 *
 * Drives the rendered login form, asserts that submitting valid
 * credentials hits POST /api/users/log-in and routes off /login,
 * and that the show/hide password toggle flips input type.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('GET /login renders email + password fields and a sign-in button', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.locator('input#email')).toBeVisible()
  await expect(page.locator('input#password')).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
})

test('login submission posts to /api/users/log-in and navigates to /inbox', async ({ page }) => {
  const email = uniqueEmail('login-post')
  const password = 'TestPass123!'
  await signup(page, email, password)
  await page.evaluate(() => window.localStorage.clear())
  await page.context().clearCookies()

  await page.goto(APP_BASE + '/login')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/inbox/, { timeout: 15_000 })
  })
  expect(reqs.some((r) => /\/api\/users\/log-in$/.test(r.url) && r.status === 200)).toBe(true)
})

test('show/hide password toggle flips the password field type', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  const pw = page.locator('input#password')
  await expect(pw).toHaveAttribute('type', 'password')
  const toggle = page.getByRole('button', { name: /show password|hide password/i })
  await toggle.click()
  await expect(pw).toHaveAttribute('type', 'text')
  await toggle.click()
  await expect(pw).toHaveAttribute('type', 'password')
})

test('forgot-password link navigates to /forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('link', { name: /forgot password/i }).click()
  await expect(page).toHaveURL(/\/forgot-password/)
})

test('sign-up link navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('link', { name: /sign up/i }).click()
  await expect(page).toHaveURL(/\/signup/)
})
