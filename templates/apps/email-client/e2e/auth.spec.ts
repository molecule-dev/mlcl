/**
 * Auth contract: signup creates a real user, login validates, the
 * access token is persisted to localStorage and authenticates
 * subsequent API calls. Email-client redirects to /inbox after
 * successful auth (not /dashboard).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  getAccessToken,
  login,
  signup,
  uniqueEmail,
} from './_helpers.js'

test('signup persists access token and the new user can call protected endpoints', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  expect(accessToken, 'access token must be present after signup').toBeTruthy()

  const res = await page.request.get(`${API_BASE}/emails/counts`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status(), await res.text()).toBe(200)
})

test('login round-trips to /inbox with the same credentials', async ({ page }) => {
  // clearCookies() below invalidates the signup session while the SPA is
  // still mounted on /inbox, so the app's session-restoration can fire one
  // /api/emails fetch with no credentials before the fresh login lands.
  // That transient 401 is the expected fallout of this test's own cookie
  // wipe, not an app bug — every assertion below still gates the flow.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
  const { email, password } = await signup(page)
  await page.context().clearCookies()
  await login(page, email, password)
  await expect(page).toHaveURL(/\/inbox/)
  const accessToken = await getAccessToken(page)
  expect(accessToken).toBeTruthy()
})

test('duplicate-email signup is rejected with a non-2xx response', async ({ page }) => {
  const email = uniqueEmail('dupe')
  await signup(page, email)

  const res = await page.request.post(`${API_BASE}/users`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password: 'TestPass123!', name: 'Dup' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBeGreaterThanOrEqual(400)
  expect(res.status()).toBeLessThan(500)
})

test('reload on /inbox while logged in does not bounce to /login', async ({ page }) => {
  await signup(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/inbox/)
})

test('protected GET /emails requires authentication', async ({ page }) => {
  const res = await page.request.get(`${API_BASE}/emails`, { failOnStatusCode: false })
  expect(res.status()).toBe(401)
})

test('unauthenticated access to /inbox redirects to /login or /signup', async ({ page }) => {
  await page.context().clearCookies()
  await page.evaluate(() => window.localStorage.clear()).catch(() => undefined)
  await page.goto(APP_BASE + '/inbox')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/(login|signup)/)
})
