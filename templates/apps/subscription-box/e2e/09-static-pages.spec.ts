/**
 * Static / unauthenticated page contract: forgot-password POSTs to the
 * real API and gets a 200 (no enumeration), reset-password consumes a
 * real DB-issued token and lets the user log in with the new password.
 *
 * The reset token is fetched directly from the `usersSecrets` table via
 * the postgres docker container. This keeps the test honest: we don't
 * mock email delivery, we just read the token the API actually wrote.
 */
import { execSync } from 'node:child_process'

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, login, uniqueEmail } from './_helpers.js'

const PG_CONTAINER = process.env.SB_PG_CONTAINER || 'molecule-dev-db-1'
const PG_DB = process.env.SB_PG_DB || 'subscription_box_test'
const PG_USER = process.env.SB_PG_USER || 'molecule'

function readResetToken(email: string): string {
  const sql = `SELECT s."passwordResetToken" FROM "usersSecrets" s JOIN users u ON u.id = s.id WHERE u.email = '${email.replace(/'/g, "''")}' LIMIT 1;`
  const out = execSync(
    `docker exec ${PG_CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -At -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8' },
  )
  return out.trim()
}

async function signupViaApi(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string,
): Promise<void> {
  const res = await request.post(`${API_BASE}/users`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password, firstName: 'Reset', lastName: 'Tester' },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(400)
}

test('Forgot-password page POSTs to /users/forgot-password and shows success state', async ({
  page,
}) => {
  const email = uniqueEmail('forgot')
  // Sign up first so the email exists — exercises the real branch.
  await signupViaApi(page.request, email, 'TestPass123!')

  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('input[type="email"]').fill(email)
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes('/api/users/forgot-password') && r.request().method() === 'POST',
  )
  await page
    .getByRole('button', { name: /send.*reset|reset.*link|submit/i })
    .first()
    .click()
  const resp = await responsePromise
  expect(resp.status(), await resp.text()).toBe(200)
  await expect(page.getByText(/check your inbox|email sent|reset link/i).first()).toBeVisible({
    timeout: 10_000,
  })
})

test('Forgot-password returns 200 for unknown emails (no user enumeration)', async ({ page }) => {
  const unknown = uniqueEmail('ghost')
  const res = await page.request.post(`${API_BASE}/users/forgot-password`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email: unknown },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
})

test('Reset-password consumes a real DB token and lets the user log in with the new password', async ({
  page,
}) => {
  const email = uniqueEmail('reset')
  const oldPassword = 'OldPass123!'
  const newPassword = 'BrandNewPass456!'

  await signupViaApi(page.request, email, oldPassword)

  // Trigger the reset email so a token is written to usersSecrets.
  const forgot = await page.request.post(`${API_BASE}/users/forgot-password`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email },
    failOnStatusCode: false,
  })
  expect(forgot.status(), await forgot.text()).toBe(200)

  const token = readResetToken(email)
  expect(token, 'reset token was not written to usersSecrets').toMatch(/^[a-f0-9]{64}$/)

  // Drive the reset-password page with the token in the URL.
  await page.goto(`${APP_BASE}/reset-password?token=${token}&email=${encodeURIComponent(email)}`)
  await page.locator('input[type="password"]').first().fill(newPassword)
  await page.locator('input[type="password"]').nth(1).fill(newPassword)
  await page
    .getByRole('button', { name: /reset.*password|save.*password|submit/i })
    .first()
    .click()
  // The page logs the user in and redirects to /dashboard on success.
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })

  // Old password no longer works
  const stale = await page.request.post(`${API_BASE}/users/log-in`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password: oldPassword },
    failOnStatusCode: false,
  })
  expect(stale.status()).toBeGreaterThanOrEqual(400)

  // New password lets them log in fresh
  await page.context().clearCookies()
  await page.evaluate(() => window.localStorage.clear())
  await login(page, email, newPassword)
})

test('Reset-password rejects an unknown token with a 401', async ({ page }) => {
  const res = await page.request.post(`${API_BASE}/users/reset-password`, {
    headers: { 'Content-Type': 'application/json' },
    data: { token: 'definitely-not-a-real-token', password: 'whateverPass123!' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(401)
})
