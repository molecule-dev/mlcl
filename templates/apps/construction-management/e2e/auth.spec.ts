import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test('signup creates an account and lands on the dashboard', async ({ page }) => {
  const { accessToken } = await signup(page)
  expect(accessToken).toBeTruthy()
  await expect(page).toHaveURL(/\/dashboard/)
  // UI-anchored: the sidebar layout is present with the app shell nav.
  await expect(page.getByRole('navigation').first()).toBeVisible()
})

test('login page round-trips an existing account', async ({ page }) => {
  const email = uniqueEmail()
  const password = 'TestPass!1234'
  const created = await signup(page, email, password)
  expect(created.accessToken).toBeTruthy()
  // Log out via the user menu, then sign back in.
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  const fresh = await page.context().newPage()
  await fresh.goto(APP_BASE + '/login')
  await fresh.locator('input#email').fill(email)
  await fresh.locator('input#password').fill(password)
  await fresh.getByRole('button', { name: /sign in/i }).click()
  await expect(fresh).not.toHaveURL(/\/login/)
  await fresh.close()
})

test('unauthenticated access to the dashboard bounces to login', async ({ page }) => {
  await page.goto(APP_BASE + '/dashboard')
  await expect(page).toHaveURL(/\/(login|signup)/)
})
