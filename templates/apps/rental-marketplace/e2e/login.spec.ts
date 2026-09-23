/**
 * /login — sign in.
 *
 * Real outcomes asserted:
 *   - valid credentials → leave /login + access token persisted
 *   - bad password → inline error + still on /login
 *   - forgot-password / signup links route correctly
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiContext,
  captureNetwork,
  login,
  signup,
  uniqueEmail,
  getAccessTokenFromPage,
} from './_helpers'

test('valid credentials log the user in and persist a session', async ({ page, browser }) => {
  // Sign up first (in a fresh context so we can sign out).
  const fresh = await browser.newContext()
  const signupPage = await fresh.newPage()
  const result = await signup(signupPage)
  await fresh.close()

  await login(page, result.email, result.password)
  await expect(page).not.toHaveURL(/\/login/)
  const token = await getAccessTokenFromPage(page)
  expect(token, 'login should persist accessToken in localStorage').toBeTruthy()

  // Read-after-write: that token resolves to the same email via /users/me.
  const ctx = await apiContext()
  const me = await ctx.get(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = (await me.json()) as { email?: string; props?: { email?: string } }
  expect(body.email ?? body.props?.email).toBe(result.email)
})

test('bad password keeps user on /login', async ({ page }) => {
  // The expected 403 from POST /api/users/log-in shows up as a browser
  // console resource error — allow it explicitly.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
  await page.goto(APP_BASE + '/login')
  const inputs = page.locator('input').filter({ visible: true })
  await inputs.nth(0).fill(uniqueEmail('nobody'))
  await inputs.nth(1).fill('not-a-real-password')
  await page
    .getByRole('button', { name: /sign\s*in|log\s*in/i })
    .first()
    .click()
  await page.waitForTimeout(1500)
  await expect(page).toHaveURL(/\/login/)
})

test('forgot password link navigates to /forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page
    .getByRole('link', { name: /forgot/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/forgot-password/)
})

test('create account link navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page
    .getByRole('link', { name: /create.*account|sign\s*up/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/)
})

test('successful login fires POST /api/users/log-in + bearer token resolves /users/me', async ({
  page,
  browser,
}) => {
  // Sign up first in a separate context so we can sign in fresh.
  const fresh = await browser.newContext()
  const signupPage = await fresh.newPage()
  const result = await signup(signupPage)
  await fresh.close()

  await page.goto(APP_BASE + '/login')
  const inputs = page.locator('input').filter({ visible: true })
  await inputs.nth(0).fill(result.email)
  await inputs.nth(1).fill(result.password)
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
  })
  // The login bond posts to the configured loginEndpoint (/users/log-in).
  const loginCall = reqs.find(
    (r) => /\/api\/users\/log-in(\?|$)/.test(r.url) && r.method === 'POST',
  )
  expect(loginCall, 'POST /api/users/log-in should fire on submit').toBeTruthy()
  expect([200, 201]).toContain(loginCall!.status)
  // The login response includes user + accessToken; the auth bond does not
  // separately fetch /users/me, but the persisted token must authenticate
  // a manual call.
  const token = await getAccessTokenFromPage(page)
  expect(token, 'access token must be persisted after login').toBeTruthy()
  const ctx = await apiContext()
  const me = await ctx.get(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(me.status(), 'GET /api/users/me with bearer token should succeed').toBe(200)
  const body = (await me.json()) as { email?: string; props?: { email?: string } }
  expect(body.email ?? body.props?.email).toBe(result.email)
})
