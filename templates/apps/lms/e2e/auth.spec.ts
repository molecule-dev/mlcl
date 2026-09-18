import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup, login, uniqueEmail, api } from './_helpers.js'

test('Signup form creates a user and redirects away from /signup', async ({ page }) => {
  const { email } = await signup(page)
  expect(email).toMatch(/@example\.com$/)
  await expect(page).not.toHaveURL(/\/signup/)
})

test('Login with the credentials we just signed up with works', async ({ page }) => {
  const email = uniqueEmail('lms-login')
  const password = 'TestPass123!'
  await signup(page, email, password)
  await page.context().clearCookies()
  await page.evaluate(() => window.localStorage.clear())
  await login(page, email, password)
  await expect(page).not.toHaveURL(/\/login/)
})

test('Backend invariant: GET /api/profile/me returns a row matching the JWT', async ({ page }) => {
  const { email } = await signup(page)
  const me = await api<{ id: string; email: string }>(page, 'GET', '/profile/me')
  expect(me.id).toBeTruthy()
  expect(me.email).toBe(email)
})
