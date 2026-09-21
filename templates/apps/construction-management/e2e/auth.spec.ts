import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup, uniqueEmail } from './_helpers.js'

test('signup creates an account and lands on the dashboard', async ({ page }) => {
  const { accessToken } = await signup(page)
  expect(accessToken).toBeTruthy()
  await expect(page).toHaveURL(/\/dashboard/)
  // UI-anchored: the sidebar layout is present with the app shell nav.
  await expect(page.getByRole('navigation').first()).toBeVisible()
})

test('login page round-trips an existing account', async ({ page, browser }) => {
  const email = uniqueEmail()
  const password = 'TestPass!1234'
  const created = await signup(page, email, password)
  expect(created.accessToken).toBeTruthy()
  // The signup session is still authenticated (Login redirects
  // authenticated users to /dashboard), so exercise the round-trip from a
  // FRESH context without the auth cookie — that is the session shape the
  // login form actually renders for.
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  const fresh = await browser.newContext()
  const freshPage = await fresh.newPage()
  await login(freshPage, email, password)
  // UI-anchored: the authenticated app shell loads.
  await expect(freshPage.getByRole('navigation').first()).toBeVisible()
  await fresh.close()
})

test('unauthenticated access to the dashboard bounces to login', async ({ page }) => {
  await page.goto(APP_BASE + '/dashboard')
  await expect(page).toHaveURL(/\/(login|signup)/)
})
