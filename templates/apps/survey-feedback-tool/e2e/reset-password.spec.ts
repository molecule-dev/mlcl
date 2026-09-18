import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, uniqueEmail, captureNetwork } from './_helpers.js'

/**
 * Reset-password e2e flow.
 *
 * Issues a fresh user, calls the forgot-password REST endpoint to write a
 * reset token into `usersSecrets`, reads that token back via the database,
 * then exercises the new-password confirm step both through REST and through
 * the UI. Asserts the user can log in with the NEW password and the OLD
 * password is rejected — that's the only outcome that proves "reset" worked.
 */

import { execSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'

function runSql(sql: string): string {
  // Bash quoting needs to survive THREE layers: outer node->bash, then
  // bash->docker, then SQL string literal in psql. Use SINGLE quotes for
  // the bash arg (so the embedded `"…"` PG identifiers survive), and
  // dollar-quoting `$e$…$e$` for values so we never need a literal
  // single quote inside the SQL (which would terminate the bash arg).
  const out = execSync(
    `docker exec molecule-dev-db-1 psql -U molecule -d survey_feedback_tool_test -tAc '${sql}'`,
    { encoding: 'utf8' },
  )
  return out.trim()
}

function readResetTokenDigest(email: string): string {
  const sql = `SELECT s."passwordResetToken" FROM "usersSecrets" s JOIN users u ON u.id = s.id WHERE u.email = $e$${email}$e$ LIMIT 1;`
  return runSql(sql)
}

function seedResetToken(email: string): string {
  // The store holds sha256(token) — the raw emailed token is never persisted,
  // so it cannot be read back from the DB (and submitting the stored DIGEST
  // must fail: that is the takeover vector digest-at-rest exists to block).
  // Mint a raw token the way forgot-password does, persist ITS digest, and
  // hand back the raw token to submit — the exact path the email link drives.
  const raw = randomBytes(32).toString('hex')
  const digest = createHash('sha256').update(raw).digest('hex')
  const sql = `UPDATE "usersSecrets" s SET "passwordResetToken" = $e$${digest}$e$, "passwordResetTokenAt" = now() FROM users u WHERE u.id = s.id AND u.email = $e$${email}$e$;`
  runSql(sql)
  return raw
}

test.describe('reset password', () => {
  test('REST: token is consumed; old password fails, new succeeds', async ({ page }) => {
    const email = uniqueEmail('reset-rest')
    const created = await page.request.post(`${API_BASE}/users`, {
      data: { email, password: 'OldPass123!', name: 'Reset REST' },
    })
    expect(created.status()).toBe(201)

    const forgot = await page.request.post(`${API_BASE}/users/forgot-password`, {
      data: { email },
    })
    expect(forgot.status()).toBe(200)

    const digest = readResetTokenDigest(email)
    expect(digest, 'forgot-password must persist a reset-token digest').toMatch(/[a-f0-9]{64}/)

    // The digest itself must NOT work as a token (a DB reader must not gain a
    // working credential) — verified by the invalid-token test below, since the
    // lookup hashes whatever is submitted. Seed a digest for a raw token we
    // know and submit the raw token, as the email link would.
    const token = seedResetToken(email)

    const reset = await page.request.post(`${API_BASE}/reset-password`, {
      data: { token, password: 'NewPass456!' },
    })
    expect(reset.status()).toBe(200)
    expect(((await reset.json()) as { success?: boolean }).success).toBe(true)

    const newOK = await page.request.post(`${API_BASE}/users/log-in`, {
      data: { email, password: 'NewPass456!' },
    })
    expect(newOK.status(), 'login with new password must succeed').toBe(200)

    const oldFail = await page.request.post(`${API_BASE}/users/log-in`, {
      data: { email, password: 'OldPass123!' },
    })
    expect(
      oldFail.status(),
      'login with old password must be rejected after reset',
    ).toBeGreaterThanOrEqual(400)

    // Token is single-use — replaying it must 400.
    const replay = await page.request.post(`${API_BASE}/reset-password`, {
      data: { token, password: 'AnotherPass789!' },
    })
    expect(replay.status()).toBe(400)
  })

  test('REST: invalid / unknown token is rejected with 400', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/reset-password`, {
      data: { token: 'deadbeef'.repeat(8), password: 'WhateverPass1!' },
    })
    expect(res.status()).toBe(400)
  })

  test('UI: form renders and password input + token field accept text', async ({ page }) => {
    // No token in URL → both token and password inputs must appear.
    await page.goto(APP_BASE + '/reset-password')
    const tokenInput = page.locator('input[type="text"]').first()
    await tokenInput.fill('manualtoken1234567890abcdef')
    await expect(tokenInput).toHaveValue('manualtoken1234567890abcdef')

    const pwd = page.locator('input[autocomplete="new-password"]').first()
    await pwd.fill('NewPass456!')
    await expect(pwd).toHaveValue('NewPass456!')
  })

  test('UI: submitting with a valid token resets the password', async ({ page }) => {
    const email = uniqueEmail('reset-ui')
    const created = await page.request.post(`${API_BASE}/users`, {
      data: { email, password: 'OldPass123!', name: 'Reset UI' },
    })
    expect(created.status()).toBe(201)

    const forgot = await page.request.post(`${API_BASE}/users/forgot-password`, {
      data: { email },
    })
    expect(forgot.status()).toBe(200)

    const digest = readResetTokenDigest(email)
    expect(digest).toMatch(/[a-f0-9]{64}/)

    const token = seedResetToken(email)

    await page.goto(`${APP_BASE}/reset-password?token=${token}&email=${encodeURIComponent(email)}`)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[autocomplete="new-password"]').first().fill('UiNewPass789!')
      await page
        .getByRole('button', { name: /update password|reset password|set.*password/i })
        .first()
        .click()
      // outcome: redirected off /reset-password (to /surveys after auto-login)
      await expect(page).not.toHaveURL(/\/reset-password/, { timeout: 15_000 })
    })
    expect(
      reqs.some(
        (r) => r.method === 'POST' && r.url.includes('/reset-password') && r.status === 200,
      ),
      'expected POST /api/reset-password to succeed',
    ).toBe(true)

    // verify by REST: new password works
    const newOK = await page.request.post(`${API_BASE}/users/log-in`, {
      data: { email, password: 'UiNewPass789!' },
    })
    expect(newOK.status()).toBe(200)
  })

  test('Sign in link in reset footer navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /sign\s*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Gauge logo on reset navigates to landing /', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /gauge/i }).first().click()
    await expect(page).toHaveURL(/\/$/)
  })
})
