/**
 * Forgot-password / reset-password lifecycle.
 *
 * Verifies the full round-trip against the real API + DB: sign up → POST
 * /api/users/forgot-password → 64-hex token DIGEST persisted → the digest
 * itself is rejected (hash-at-rest contract) → a raw token seeded the way
 * forgot-password does completes POST /api/users/reset-password → can log
 * in with the new password, old password rejected.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { Client } from 'pg'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://molecule:molecule@127.0.0.1:5432/ai_study_buddy_test'

test('/forgot-password renders the public reset form', async ({ page }) => {
  await page.goto(`${APP_BASE}/forgot-password`)
  await expect(page.locator('[data-mol-id="forgot-email"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="forgot-submit"]')).toBeVisible()
})

test('/forgot-password submission posts /api/users/forgot-password and shows confirmation', async ({
  page,
}) => {
  const credentials = await signup(page)
  await page.goto(`${APP_BASE}/forgot-password`)
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="forgot-email"]').fill(credentials.email)
    await page.locator('[data-mol-id="forgot-submit"]').click()
    await expect(page.locator('[data-mol-id="forgot-sent"]')).toBeVisible({ timeout: 15_000 })
  })
  const call = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST')
  expect(call, 'forgot-password should POST /api/users/forgot-password').toBeTruthy()
  expect([200, 204]).toContain(call!.status)
})

test('/reset-password accepts token query param and pre-fills hidden fields', async ({ page }) => {
  await page.goto(`${APP_BASE}/reset-password?token=abc&email=foo@example.com`)
  await expect(page.locator('[data-mol-id="reset-password"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="reset-confirm"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="reset-submit"]')).toBeVisible()
})

test('/reset-password full round-trip: forgot → DB token → reset → login with new password', async ({
  page,
}) => {
  // The platform stores only sha256(token) at rest (see hashResetToken in
  // the user resource): the RAW token is delivered solely by the reset
  // email and can never be read back from the DB. Submitting the stored
  // digest must FAIL — a DB dump must not grant a password reset; that is
  // the takeover vector digest-at-rest exists to block. So the round-trip
  // now: (1) verify forgot-password persisted a 64-hex digest, (2) prove
  // the digest itself is rejected 401, (3) seed our own raw token exactly
  // the way forgot-password does and submit THAT — the path the email
  // link drives — then confirm the new password works and the old is
  // rejected.
  const { createHash, randomBytes } = await import('node:crypto')
  const email = uniqueEmail('recover')
  const password = 'OldPass123!'
  const signupRes = await page.request.post(`${API_BASE}/users`, {
    data: { email, password, name: 'Recoverer' },
    failOnStatusCode: false,
  })
  expect(signupRes.status()).toBe(201)

  const forgot = await page.request.post(`${API_BASE}/users/forgot-password`, {
    data: { email },
    failOnStatusCode: false,
  })
  expect([200, 204]).toContain(forgot.status())

  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  let digest = ''
  let rawToken = ''
  try {
    // forgot-password writes sha256(rawToken) into "usersSecrets" (id = user.id).
    const rows = await client.query<{ password_reset_token: string | null }>(
      `SELECT s."passwordResetToken" AS password_reset_token
         FROM users u
         JOIN "usersSecrets" s ON s.id = u.id
        WHERE u.email = $1`,
      [email],
    )
    digest = rows.rows[0]?.password_reset_token ?? ''
    expect(
      digest,
      'forgot-password handler must write a passwordResetToken digest to usersSecrets',
    ).toMatch(/^[0-9a-f]{64}$/)

    // The at-rest digest is NOT a usable credential.
    const digestAttempt = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { token: digest, password: 'ShouldFail123!' },
      failOnStatusCode: false,
    })
    expect(digestAttempt.status(), 'the stored digest must NOT complete a reset').toBe(401)

    // Seed a known raw token exactly the way forgot-password does.
    rawToken = randomBytes(32).toString('hex')
    const seededDigest = createHash('sha256').update(rawToken).digest('hex')
    await client.query(
      `UPDATE "usersSecrets"
          SET "passwordResetToken" = $1, "passwordResetTokenAt" = now()
        WHERE id = (SELECT id FROM users WHERE email = $2)`,
      [seededDigest, email],
    )
  } finally {
    await client.end()
  }

  const newPassword = 'NewPass456!'
  // /users/reset-password persists the new passwordHash and clears the
  // reset token.
  const reset = await page.request.post(`${API_BASE}/users/reset-password`, {
    data: { token: rawToken, password: newPassword },
    failOnStatusCode: false,
  })
  expect(reset.status(), await reset.text()).toBe(200)

  const newLogin = await page.request.post(`${API_BASE}/users/log-in`, {
    data: { email, password: newPassword },
    failOnStatusCode: false,
  })
  expect(newLogin.status(), await newLogin.text()).toBe(200)

  const oldLogin = await page.request.post(`${API_BASE}/users/log-in`, {
    data: { email, password },
    failOnStatusCode: false,
  })
  expect(oldLogin.status()).not.toBe(200)
})
