/**
 * Login — picking up an already-signed-up user via the email/password
 * form lands them off /login and lets them read owner-scoped resources.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, login, signup } from './_helpers.js'

test('Login form is visible at /login', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('Login picks up an existing user and redirects off /login', async ({ page }) => {
  const { email, password } = await signup(page)
  await page.evaluate(() => {
    try {
      window.localStorage.clear()
    } catch {
      /* ignore */
    }
  })
  await page.context().clearCookies()
  await login(page, email, password)
  expect(new URL(page.url()).pathname).not.toBe('/login')
})

test('After login the user can fetch owner-scoped notifications', async ({ page }) => {
  const { email, password } = await signup(page)
  await page.evaluate(() => {
    try {
      window.localStorage.clear()
    } catch {
      /* ignore */
    }
  })
  await page.context().clearCookies()
  await login(page, email, password)
  const notifs = await apiRequest<{ data: unknown[] }>(page, 'GET', '/api/notifications')
  expect(notifs.status).toBe(200)
})

test('Login submit fires POST /api/users/log-in', async ({ page }) => {
  const { email, password } = await signup(page)
  await page.evaluate(() => {
    try {
      window.localStorage.clear()
    } catch {
      /* ignore */
    }
  })
  await page.context().clearCookies()
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page
      .getByRole('button', { name: /Initialize Session|Sign in|Log in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  })
  const post = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
  expect(post, 'POST /api/users/log-in must fire on submit').toBeTruthy()
  expect(post!.status).toBeLessThan(400)
})
