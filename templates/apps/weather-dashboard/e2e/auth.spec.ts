import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, BRAND, signup, uniqueEmail } from './_helpers.js'

test('Signup creates a user and lands on /dashboard', async ({ page }) => {
  await signup(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.locator('aside')).toContainText(new RegExp(BRAND, 'i'))
})

test('Login works with a known account', async ({ page }) => {
  const { email, password } = await signup(page, uniqueEmail('login-test'))
  // Logout via API by clearing localStorage (UI logout is also tested).
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page
    .getByRole('button', { name: /log\s*in/i })
    .first()
    .click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
})

test('Authenticated user lands on /dashboard with sidebar nav', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.locator('aside')).toContainText('Dashboard')
  await expect(page.locator('aside')).toContainText('Locations')
  await expect(page.locator('aside')).toContainText('Radar')
  await expect(page.locator('aside')).toContainText('Alerts')
  await expect(page.locator('aside')).toContainText('Trends')
  await expect(page.locator('aside')).toContainText('Compare')
  await expect(page.locator('aside')).toContainText('Billing')
  await expect(page.locator('aside')).toContainText('Settings')
})
