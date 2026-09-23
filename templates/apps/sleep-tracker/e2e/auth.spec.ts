/**
 * Auth contract: signup creates a real user, login validates, the access
 * token is persisted as an httpOnly cookie and authenticates subsequent
 * API calls, and a duplicate-email signup is rejected.
 *
 * The "outcome" we're asserting is not "the form submitted" — it's
 * "the next GET /sleep on the new user's token returns 200 with a real
 * sleep_logs collection scoped to that user".
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
  expect(accessToken, 'access token must be present in localStorage after signup').toBeTruthy()

  const res = await page.request.get(`${API_BASE}/sleep`, { headers: apiHeaders(accessToken) })
  expect(res.status(), await res.text()).toBe(200)
  const list = (await res.json()) as unknown[]
  expect(Array.isArray(list)).toBe(true)
  // brand-new user has no logs yet
  expect(list.length).toBe(0)
})

test('login round-trips to /dashboard with the same credentials', async ({ page }) => {
  const { email, password } = await signup(page)
  // Leave the authed Dashboard BEFORE invalidating the session (same
  // artifact as forgot-password.spec.ts): clearing cookies while it is
  // still mounted makes its in-flight refetches log 401 console errors.
  await page.goto(APP_BASE + '/login')
  await page.waitForLoadState('networkidle')
  await page.context().clearCookies()
  await page.evaluate(() => window.localStorage.clear())
  await login(page, email, password)
  await expect(page).toHaveURL(/\/dashboard/)
  const accessToken = await getAccessToken(page)
  expect(accessToken).toBeTruthy()
})

test('duplicate-email signup is rejected with a non-2xx response', async ({ page }) => {
  const email = uniqueEmail('dupe')
  await signup(page, email)

  // Try again with the same email via the public registration endpoint
  const res = await page.request.post(`${API_BASE}/users`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password: 'TestPass123!', name: 'Dup' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBeGreaterThanOrEqual(400)
  expect(res.status()).toBeLessThan(500)
})

test('signup→logout→login restores access (state is server-persisted, not just client memory)', async ({
  page,
}) => {
  const { email, password } = await signup(page)
  // Leave the authed Dashboard BEFORE invalidating the session (same
  // artifact as forgot-password.spec.ts): clearing cookies while it is
  // still mounted makes its in-flight refetches log 401 console errors.
  await page.goto(APP_BASE + '/login')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => window.localStorage.clear())
  await page.context().clearCookies()
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /sign\s*in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
  // Reload — session should still be valid
  await page.reload()
  await expect(page).toHaveURL(/\/dashboard/)
})

test('reload on /dashboard while logged in does not bounce to /login', async ({ page }) => {
  await signup(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/dashboard/)
})

test('protected GET /sleep requires authentication', async ({ page }) => {
  const res = await page.request.get(`${API_BASE}/sleep`, { failOnStatusCode: false })
  expect(res.status()).toBe(401)
})
