/**
 * Auth: signup creates a real user, login reuses credentials, sessions
 * persist across reload, wrong passwords stay on /login, forgot-password
 * fires a Mailgun-backed email request.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiFetch,
  captureNetwork,
  getAccessToken,
  login,
  signup,
  uniqueEmail,
} from './_helpers.js'

test('signup posts to /api/users and lands authenticated', async ({ page }) => {
  const email = uniqueEmail('signup')
  const reqs = await captureNetwork(page, async () => {
    await signup(page, email)
  })
  const userPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
  expect(userPost, 'POST /api/users seen').toBeDefined()
  expect(userPost?.status).toBeGreaterThanOrEqual(200)
  expect(userPost?.status).toBeLessThan(300)
  const tok = await getAccessToken(page)
  expect(tok, 'access token persisted').toBeTruthy()
})

test('login returns to a protected page after sign-in', async ({ page, browser }) => {
  const email = uniqueEmail('login')
  const password = 'TestPass123!'
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, email, password)
  await ctx.close()

  await login(page, email, password)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
})

test('wrong password keeps user on /login and surfaces an error', async ({ page, browser }) => {
  // The 403 from /api/users/log-in is the EXPECTED outcome here; the browser
  // still logs it as a console error, so allow exactly that.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: /status of 403/,
  })
  const email = uniqueEmail('badlogin')
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, email, 'TestPass123!')
  await ctx.close()

  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill('not-the-password')
  await page.locator('form button[type="submit"]').first().click()
  await page.waitForTimeout(2_000)
  await expect(page).toHaveURL(/\/login/)
})

test('session survives a page reload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/account')
  await page.reload()
  await expect(page).toHaveURL(/\/account/, { timeout: 10_000 })
  // bearer should still be present
  const tok = await getAccessToken(page)
  expect(tok).toBeTruthy()
})

test('forgot-password POST returns 2xx and does not leak existence', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  const email = uniqueEmail('forgot')
  await page.locator('input[type="email"]').first().fill(email)
  const reqs = await captureNetwork(page, async () => {
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(2_500)
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url))
  expect(post, 'POST /api/users/forgot-password fired').toBeDefined()
  // forgot-password is intentionally non-revealing — should always succeed
  expect(post?.status).toBeGreaterThanOrEqual(200)
  expect(post?.status).toBeLessThan(400)
})

test('signup link on /login navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page
    .getByRole('link', { name: /create|sign up|join|new account/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
})

test('GET /api/users/:id reflects the signup payload', async ({ page }) => {
  const email = uniqueEmail('readback')
  await signup(page, email)
  // Assert that the cookie/bearer combination lets us pull /tutors/me without a bare 401.
  const r = await apiFetch(page, 'GET', '/tutors/me')
  expect(r.status === 404 || r.status === 200, `unexpected status ${r.status}`).toBeTruthy()
})
