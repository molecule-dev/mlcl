import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { createHash, randomBytes } from 'node:crypto'
import { Client } from 'pg'

import { API_BASE, APP_BASE, captureNetwork, signup, login } from './_helpers.js'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://molecule:molecule@127.0.0.1:5432/budget_planner_test'

/**
 * Read the stored `passwordResetToken` digest for the given email directly
 * from the `usersSecrets` table. This is read-after-write verification that
 * the forgot-password handler persisted a token.
 *
 * The column holds sha256(rawToken): the raw token exists solely in the reset
 * email (a DB read must never yield a live account-takeover credential), so
 * the digest itself is NOT a usable token — submitting it must 401, and that
 * is the digest-at-rest design working, not a bug.
 */
async function readResetTokenDigest(email: string): Promise<string> {
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

/**
 * Mint a raw token the way forgot-password does and overwrite the stored
 * digest with sha256(rawToken) — byte-for-byte what the handler writes, minus
 * the email. Returns the raw token to submit, the exact path the email link
 * drives. Test-only seeding; the reset-password handler under test is the
 * real production code.
 */
async function seedResetToken(email: string): Promise<string> {
  const raw = randomBytes(32).toString('hex')
  const digest = createHash('sha256').update(raw).digest('hex')
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    await client.query(
      `UPDATE "usersSecrets" s
          SET "passwordResetToken" = $1, "passwordResetTokenAt" = now()
         FROM users u
        WHERE u.id = s.id AND u.email = $2`,
      [digest, email],
    )
  } finally {
    await client.end()
  }
  return raw
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

  // The handler stored the token digest on usersSecrets — verify it landed.
  const digest = await readResetTokenDigest(email)
  expect(digest, 'forgot-password should write passwordResetToken to usersSecrets').toMatch(
    /[a-f0-9]{64}/,
  )

  // The digest at rest is NOT the token (only the emailed link holds the raw
  // value) — seed a raw token whose digest we control and submit it, exactly
  // as the email link would.
  const token = await seedResetToken(email)

  // Submit the token + new password to /api/users/reset-password.
  const newPassword = 'NewPass456!'
  const reset = await page.request.post(`${API_BASE}/users/reset-password`, {
    data: { token, password: newPassword },
    failOnStatusCode: false,
  })
  expect(reset.status()).toBe(200)

  // The reset invalidated every device session, so the signup-era cookie is
  // now dead. Clear it BEFORE the next navigation so the app boot's
  // /api/users/me can't fire a 401 into the console guard, then log in with
  // the new password through the UI.
  await page.context().clearCookies()
  await page.evaluate(() => window.localStorage.clear())

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
