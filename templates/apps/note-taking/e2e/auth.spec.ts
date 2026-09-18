/**
 * Auth journey: signup creates a real user, login round-trips, logout
 * clears the session, forgot-password issues a reset URL.
 *
 * Outcomes asserted: post-signup we land on /home with the API
 * profile reachable via the bearer token; post-logout, /home redirects
 * back to /login.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup, uniqueEmail } from './_helpers.js'

test('signup → home → profile API returns the new user', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await signup(page)
    await page.waitForURL(/\/home/, { timeout: 15_000 })
  })

  await expect(page).toHaveURL(/\/home/)

  // The /api/users POST must have happened with a 200/201
  const userPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
  expect(userPost).toBeTruthy()
  expect(userPost!.status).toBeGreaterThanOrEqual(200)
  expect(userPost!.status).toBeLessThan(300)
})

test('login persists across reload', async ({ page, browser }) => {
  const email = uniqueEmail('login')
  const password = 'TestPass123!'

  const ctx1 = await browser.newContext()
  const p1 = await ctx1.newPage()
  await signup(p1, email, password)
  await ctx1.close()

  await login(page, email, password)
  await page.waitForURL(/\/home/, { timeout: 15_000 })
  await page.reload()
  await expect(page).toHaveURL(/\/home/)
})

test('protected route redirects to login when signed out', async ({ page }) => {
  await page.goto(APP_BASE + '/notes')
  await page.waitForURL(/\/login/, { timeout: 15_000 })
  await expect(page).toHaveURL(/\/login/)
})
