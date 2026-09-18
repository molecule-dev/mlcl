/**
 * Auth contract: signup creates a real user, login validates the same
 * credentials, the access token authenticates protected endpoints, and
 * a duplicate-email signup is rejected.
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

  const res = await page.request.get(`${API_BASE}/subscriptions/mine`, {
    headers: apiHeaders(accessToken),
  })
  expect([200, 404]).toContain(res.status())
})

test('login round-trips to /dashboard with the same credentials', async ({ page }) => {
  const { email, password } = await signup(page)
  await page.context().clearCookies()
  await page.evaluate(() => window.localStorage.clear())
  await login(page, email, password)
  await expect(page).toHaveURL(/\/dashboard/)
  const accessToken = await getAccessToken(page)
  expect(accessToken).toBeTruthy()
})

test('duplicate-email signup is rejected with a non-2xx response', async ({ page }) => {
  const email = uniqueEmail('dupe')
  await signup(page, { email })

  const res = await page.request.post(`${API_BASE}/users`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password: 'TestPass123!', name: 'Dup Curator' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBeGreaterThanOrEqual(400)
  expect(res.status()).toBeLessThan(500)
})

test('reload on /dashboard while logged in does not bounce to /login', async ({ page }) => {
  await signup(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/dashboard/)
})

test('unauthenticated request to /api/subscriptions/mine returns 401', async ({ page }) => {
  const res = await page.request.get(`${API_BASE}/subscriptions/mine`, {
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(401)
})

test('landing page renders without auth and CTA to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /start your box/i }).first()).toBeVisible()
  await page
    .getByRole('link', { name: /start your box/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/)
})

test('login page renders email + password fields', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
})

test('logging out clears auth and redirects unauthenticated routes to /login', async ({ page }) => {
  await signup(page)
  // Under M1-1 the session is the httpOnly `token` cookie (+ mol_auth hint),
  // not a localStorage bearer copy, so clearing storage alone leaves the
  // session restorable; the cookies must go too for a real logout.
  await page.context().clearCookies()
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForURL(/\/login/, { timeout: 15_000 })
})
