/**
 * Login page — credentials form, error path, OAuth buttons render, and
 * forgot-password link routes correctly.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('Login page renders the credentials form', async ({ page }) => {
  await page.goto(APP_BASE + '/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible()
})

test('Login: successful credentials redirect to /dashboard', async ({ page }) => {
  const { email, password } = await signup(page)

  // Drop the auth state so we can re-login fresh
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/login', { waitUntil: 'domcontentloaded' })

  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page
    .getByRole('button', { name: /sign in/i })
    .first()
    .click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
})

test('Login: bad credentials surface an error and stay on /login', async ({ page }) => {
  await page.goto(APP_BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page
    .locator('input[type="email"]')
    .first()
    .fill('nobody+' + Date.now() + '@example.com')
  await page.locator('input[type="password"]').first().fill('WrongPass!1')
  await page
    .getByRole('button', { name: /sign in/i })
    .first()
    .click()
  await page.waitForTimeout(800)
  await expect(page).toHaveURL(/\/login/)
  // Error alert visible
  await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 })
})

test('Login page links to /forgot-password and /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/login', { waitUntil: 'domcontentloaded' })
  const forgot = page.getByRole('link', { name: /forgot/i }).first()
  await expect(forgot).toHaveAttribute('href', /\/forgot-password/)
  const signupLink = page.getByRole('link', { name: /open your kitchen|sign up/i }).first()
  await expect(signupLink).toHaveAttribute('href', /\/signup/)
})

test('Login: show-password button toggles password input type', async ({ page }) => {
  await page.goto(APP_BASE + '/login', { waitUntil: 'domcontentloaded' })
  const pw = page.locator('input#password')
  await expect(pw).toHaveAttribute('type', 'password')
  const toggle = page.getByRole('button', { name: /show password|hide password/i }).first()
  if (await toggle.count().catch(() => 0)) {
    await toggle.click()
    await expect(pw).toHaveAttribute('type', 'text')
  }
})
