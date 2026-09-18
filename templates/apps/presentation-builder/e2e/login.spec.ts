/**
 * /login — log-in page.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('login: page renders the login form', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
})

test('login: a "sign in" submit button exists', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()).toBeVisible()
})

test('login: a "/signup" control is reachable from the login page', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  // Either an <a href="/signup"> link or a button with sign-up label.
  //
  // What was wrong: `page.goto()` resolves on the `load` event, but this is a Vite
  // SPA whose `#root` is still empty at that instant — React paints ~150-200ms
  // later. `count()` is a one-shot read with NO auto-waiting, so both counts
  // sampled the pre-paint DOM and summed to 0. (Measured on this page: 0 matches
  // at `goto`; once painted there is no anchor at all — the control is a
  // `<button onClick={() => navigate('/signup')}>` — so the button half of the
  // union is load-bearing and must be kept.)
  const signupControl = page
    .locator('a[href="/signup"]')
    .or(page.getByRole('button', { name: /sign\s*up|create.*account|register|get\s*started/i }))
  await expect(signupControl.first()).toBeVisible()
})

test('login: submitting valid credentials POSTs and signs the user in', async ({ page }) => {
  const email = uniqueEmail('login')
  const password = 'Logger-Pass-123!'
  await signup(page, email, password)
  await page.context().clearCookies()

  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
  })

  const session = reqs.find(
    (r) => r.method === 'POST' && /\/api\/(sessions|users\/log-?in|auth)/.test(r.url),
  )
  expect(session, 'session creation request must fire').toBeTruthy()
  expect(session!.status).toBeLessThan(300)
})
