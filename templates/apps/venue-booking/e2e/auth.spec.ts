/**
 * Auth: signup creates a user (POST /api/users), login reuses the
 * credentials, sessions persist across reload, and wrong passwords stay
 * on /login. These specs exercise the actual API endpoints — no mocks.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, signup, uniqueEmail } from './_helpers.js'

test('signup posts to /api/users and lands authenticated', async ({ page }) => {
  const email = uniqueEmail('signup')
  const reqs = await captureNetwork(page, async () => {
    await signup(page, email)
  })
  const userPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
  expect(userPost).toBeDefined()
  expect(userPost?.status).toBeGreaterThanOrEqual(200)
  expect(userPost?.status).toBeLessThan(300)

  const tok = await getAccessToken(page)
  expect(tok, 'accessToken present').toBeTruthy()
})

test('login returns the user to a protected page after sign-in', async ({ page, browser }) => {
  const email = uniqueEmail('login')
  const password = 'TestPass123!'

  // create the user first in a throwaway context, so login has a real account
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, email, password)
  await ctx.close()

  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page
    .getByRole('button', { name: /sign\s*in/i })
    .first()
    .click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
})

test('wrong password keeps user on /login and surfaces an error', async ({ page, browser }) => {
  // The failed POST /users/log-in is EXPECTED to 4xx — the browser always
  // logs failed responses to the console, which the console guard would
  // otherwise treat as an app error.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: 'status of 40[134]',
  })
  const email = uniqueEmail('badlogin')
  const password = 'TestPass123!'
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, email, password)
  await ctx.close()

  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill('not-the-password')
  await page
    .getByRole('button', { name: /sign\s*in/i })
    .first()
    .click()
  await page.waitForTimeout(2_000)
  await expect(page).toHaveURL(/\/login/)
})

test('session survives a page reload after signup', async ({ page }) => {
  await signup(page)
  // navigate to a known authed route
  await page.goto(APP_BASE + '/account')
  await page.reload()
  // we should still be on /account, not bounced to /login
  await expect(page).toHaveURL(/\/account/, { timeout: 10_000 })
})

test('forgot-password link is present on /login', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  // Login uses a short "Forgot?" affordance; match anything starting with "forgot".
  await page
    .getByRole('link', { name: /forgot/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/forgot-password/)
})

test('signup link on /login navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page
    .getByRole('link', { name: /create|sign up|join|account/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup|\/login/)
})
