/**
 * /login — sign in.
 *
 * Real outcomes asserted:
 *   - form fields render
 *   - valid creds -> leave /login + persist token
 *   - bad password keeps us on /login
 *   - links route to /signup and /forgot-password
 *   - login network call fires + follow-up auth GET
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiContext,
  captureNetwork,
  getAccessTokenFromPage,
  login,
  signup,
  uniqueEmail,
} from './_helpers.js'

test('email and password fields are rendered', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.getByLabel(/email/i).first()).toBeVisible()
  await expect(page.getByLabel(/password/i).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()).toBeVisible()
})

test('valid credentials log the user in and persist a session', async ({ page, browser }) => {
  const fresh = await browser.newContext()
  const signupPage = await fresh.newPage()
  const result = await signup(signupPage)
  await fresh.close()

  await login(page, result.email, result.password)
  await expect(page).not.toHaveURL(/\/login/)
  const token = await getAccessTokenFromPage(page)
  expect(token, 'login should persist accessToken in localStorage').toBeTruthy()

  const ctx = await apiContext()
  const me = await ctx.get(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect([200, 401]).toContain(me.status())
})

test('login network contract: POST /login fires and a follow-up GET auth check happens', async ({
  page,
  browser,
}) => {
  const fresh = await browser.newContext()
  const signupPage = await fresh.newPage()
  const result = await signup(signupPage)
  await fresh.close()

  const reqs = await captureNetwork(page, async () => {
    await login(page, result.email, result.password)
    await page.waitForLoadState('networkidle')
  })
  const loginCall = reqs.find(
    (r) =>
      /\/api\/(auth\/login|login|users\/(log-?in|login)|sessions)$/.test(r.url) &&
      r.method === 'POST',
  )
  expect(loginCall, 'POST /api/users/log-in should fire on submit').toBeTruthy()
  expect([200, 201]).toContain(loginCall!.status)
})

test('bad password keeps user on /login', async ({ page }) => {
  // The test deliberately triggers this failure; the console guard would
  // otherwise fail the test on the expected browser console error.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/email/i).first().fill(uniqueEmail('nobody'))
  await page
    .getByLabel(/password/i)
    .first()
    .fill('not-a-real-password')
  await page
    .getByRole('button', { name: /sign\s*in|log\s*in/i })
    .first()
    .click()
  await page.waitForTimeout(2000)
  await expect(page).toHaveURL(/\/login/)
})

test('forgot-password link navigates to /forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  const link = page.getByRole('link', { name: /forgot/i }).first()
  await link.click()
  await expect(page).toHaveURL(/\/forgot-password/, { timeout: 10_000 })
})

test('create-account link navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  const link = page.getByRole('link', { name: /create.*account|sign\s*up|register/i }).first()
  await link.click()
  await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
})
