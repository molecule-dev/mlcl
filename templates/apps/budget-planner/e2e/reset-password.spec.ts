import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { Client } from 'pg'

import { API_BASE, APP_BASE, captureNetwork, signup, login } from './_helpers.js'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://molecule:molecule@127.0.0.1:5432/budget_planner_test'

/**
 * Read the `passwordResetToken` for the given email directly from the
 * `usersSecrets` table. The forgot-password handler writes the token to
 * the DB and emails it to the user; in dev/test there's no inbox to
 * intercept, so we read the DB row that the same handler just wrote.
 *
 * This is read-after-write verification of the same column the production
 * reset-password handler validates against — no debug endpoints, no
 * production code shaped around test-only concerns.
 */
async function readResetToken(email: string): Promise<string> {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    const rows = await client.query<{ token: string | null }>(
      `SELECT s."passwordResetToken" AS token
         FROM users u JOIN "usersSecrets" s ON s.id = u.id
        WHERE u.email = $1`,
      [email],
    )
    return rows.rows[0]?.token ?? ''
  } finally {
    await client.end()
  }
}

test('reset-password form renders password + confirm fields', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=fake')
  await expect(page.locator('input#password')).toBeVisible()
  await expect(page.locator('input#confirm')).toBeVisible()
  await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
})

test('Submitting without a token shows the missing-token error', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password')
  await page.locator('input#password').fill('NewPassword123!')
  await page.locator('input#confirm').fill('NewPassword123!')
  await page.getByRole('button', { name: /reset password/i }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText(/missing|expired/i)).toBeVisible()
})

test('Mismatched passwords show alert and never POST reset', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/reset-password?token=any')
    await page.locator('input#password').fill('NewPassword123!')
    await page.locator('input#confirm').fill('Different456!')
    await page.getByRole('button', { name: /reset password/i }).click()
    await page.waitForTimeout(500)
  })
  await expect(page.getByRole('alert')).toBeVisible()
  const reset = reqs.find((r) => r.method === 'POST' && /\/api\/users\/reset-password/.test(r.url))
  expect(reset).toBeUndefined()
})

test('end-to-end: forgot-password → use issued token → reset → log in with new password', async ({
  page,
}) => {
  const { email, password: oldPassword } = await signup(page)
  await page.evaluate(() => window.localStorage.clear())
  // Trigger forgot-password via the UI to issue a token.
  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('input#email').fill(email)
  await page.getByRole('button', { name: /send reset link/i }).click()
  await expect(page.getByRole('status')).toBeVisible({ timeout: 10000 })

  // The handler stored the token on usersSecrets — read it directly.
  // This is the same column the production reset-password handler
  // validates against, so the round-trip exercises the real flow.
  const token = await readResetToken(email)
  expect(token, 'forgot-password should write passwordResetToken to usersSecrets').toBeTruthy()

  // Submit the token + new password to /api/users/reset-password.
  const newPassword = 'NewPass456!'
  const reset = await page.request.post(`${API_BASE}/users/reset-password`, {
    data: { token, password: newPassword },
    failOnStatusCode: false,
  })
  expect(reset.status()).toBe(200)

  // The new password works at login.
  await login(page, email, newPassword)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })

  // The old password no longer works.
  const oldLogin = await page.request.post(`${API_BASE}/users/log-in`, {
    data: { email, password: oldPassword },
    failOnStatusCode: false,
  })
  expect(oldLogin.status()).not.toBe(200)
})

test('Back to sign in link returns to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password')
  await page.getByRole('link', { name: /back to sign in/i }).click()
  await expect(page).toHaveURL(/\/login/)
})
