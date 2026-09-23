/**
 * /login — sign in.
 *
 * Per-page spec covering each row in observations/login.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, login, signup, uniqueEmail } from './_helpers.js'

test('brand heading "Obscura" rendered on /login', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await expect(page.getByRole('heading', { name: /Obscura/ })).toBeVisible()
})

test('email input accepts text', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  const email = page.locator('input[type="email"]')
  await email.fill('login-input@example.com')
  await expect(email).toHaveValue('login-input@example.com')
})

test('password input accepts text and is masked', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  const pw = page.locator('input#password, input[type="password"]').first()
  await pw.fill('Secret123')
  await expect(pw).toHaveValue('Secret123')
  expect(await pw.getAttribute('type')).toBe('password')
})

test('valid credentials POST /api/users/log-in and redirect to /explore', async ({
  browser,
  page,
}) => {
  const fresh = await browser.newContext()
  const signupPage = await fresh.newPage()
  const { email, password } = await signup(signupPage)
  await fresh.close()

  const { reqs } = await captureNetwork(page, async () => {
    await login(page, email, password)
    await page.waitForLoadState('networkidle')
  })
  await expect(page).toHaveURL(/\/explore/)
  const loginCall = reqs.find((r) => /\/api\/users\/log-?in/.test(r.url) && r.method === 'POST')
  expect(loginCall, 'POST /api/users/log-in should fire').toBeTruthy()
  expect([200, 201]).toContain(loginCall!.status)
})

test('Forgot password link → /forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('link', { name: /forgot.*password/i }).click()
  await expect(page).toHaveURL(/\/forgot-password/)
})

test('Sign up link → /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page
    .getByRole('link', { name: /start sharing|sign\s*up|create.*account/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/)
})

test('Bad password keeps user on /login', async ({ page }) => {
  // The bad-credential attempt intentionally 403s on /api/users/log-in —
  // allow the expected console noise.
  test.info().annotations.push({ type: 'allow-console-error', description: /status of 403/ })
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(uniqueEmail('nobody'))
  await page.locator('input#password').fill('not-a-real-password')
  await page.getByRole('button', { name: /sign\s*in|log\s*in/i }).click()
  await page.waitForTimeout(2_000)
  await expect(page).toHaveURL(/\/login/)
  // /api/users/me without a session must 401, never returns somebody else's row.
  const me = await page.request.get(`${API_BASE}/users/me`)
  expect([401, 403]).toContain(me.status())
})
