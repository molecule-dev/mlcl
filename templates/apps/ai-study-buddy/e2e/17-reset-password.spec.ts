/**
 * /reset-password — public token-based password reset flow.
 * Verifies UI rendering, the hash-at-rest contract (a DB-read digest can
 * never complete a reset), a full raw-token round-trip via real DB, and
 * that the new password persists for subsequent /api/users/log-in.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { Client } from 'pg'

import { API_BASE, APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://molecule:molecule@127.0.0.1:5432/ai_study_buddy_test'

test('/reset-password renders password + confirm fields + submit button', async ({ page }) => {
  await page.goto(`${APP_BASE}/reset-password?token=demo&email=demo@example.com`)
  await expect(page.locator('[data-mol-id="reset-password"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="reset-confirm"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="reset-submit"]')).toBeVisible()
})

test('/reset-password back-to-sign-in link works', async ({ page }) => {
  await page.goto(`${APP_BASE}/reset-password?token=demo`)
  await page.locator('[data-mol-id="reset-login-link"]').click()
  await page.waitForURL(/\/login/)
})

test('/reset-password full round-trip: forgot → DB token → new pwd persists', async ({ page }) => {
  // The platform stores only sha256(token) at rest (hash-at-rest contract):
  // the DB value must NOT complete a reset, and a raw token seeded the way
  // forgot-password persists its digest must complete it (see 09-auth-recovery
  // for the full rationale).
  const { createHash, randomBytes } = await import('node:crypto')
  const email = uniqueEmail('rst')
  const oldPassword = 'OldRst123!'
  const newPassword = 'NewRst456!'
  await page.request.post(`${API_BASE}/users`, {
    data: { email, password: oldPassword, name: 'Reset' },
    failOnStatusCode: false,
  })
  await page.request.post(`${API_BASE}/users/forgot-password`, {
    data: { email },
    failOnStatusCode: false,
  })
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  let digest = ''
  let rawToken = ''
  try {
    const rows = await client.query<{ token: string | null }>(
      `SELECT s."passwordResetToken" AS token
         FROM users u JOIN "usersSecrets" s ON s.id = u.id
        WHERE u.email = $1`,
      [email],
    )
    digest = rows.rows[0]?.token ?? ''
    expect(digest, 'forgot-password must persist a 64-hex reset-token digest').toMatch(
      /^[0-9a-f]{64}$/,
    )

    // The at-rest digest is NOT a usable credential (DB dump ≠ takeover).
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
  const reset = await page.request.post(`${API_BASE}/users/reset-password`, {
    data: { token: rawToken, password: newPassword },
    failOnStatusCode: false,
  })
  expect(reset.status(), await reset.text()).toBe(200)

  // New password works
  const newLogin = await page.request.post(`${API_BASE}/users/log-in`, {
    data: { email, password: newPassword },
    failOnStatusCode: false,
  })
  expect(newLogin.status()).toBe(200)
  // Old password rejected
  const oldLogin = await page.request.post(`${API_BASE}/users/log-in`, {
    data: { email, password: oldPassword },
    failOnStatusCode: false,
  })
  expect(oldLogin.status()).not.toBe(200)
})

test('/reset-password expired/invalid token gets 401 from /api/users/reset-password', async ({
  page,
}) => {
  const res = await page.request.post(`${API_BASE}/users/reset-password`, {
    data: { token: 'totally-bogus-token', password: 'NewPass789!' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(401)
})

test('/reset-password page-reset-password container renders', async ({ page }) => {
  await page.goto(`${APP_BASE}/reset-password?token=demo&email=demo@example.com`)
  await expect(page.locator('[data-mol-id="page-reset-password"]')).toBeVisible()
})

test('/reset-password renders the "Set a new password" h2', async ({ page }) => {
  await page.goto(`${APP_BASE}/reset-password?token=demo&email=demo@example.com`)
  await expect(page.getByRole('heading', { name: /set a new password/i })).toBeVisible()
})

test('/reset-password without ?email shows an editable email input', async ({ page }) => {
  await page.goto(`${APP_BASE}/reset-password?token=demo`)
  await expect(page.locator('#email')).toBeVisible()
})

test('/reset-password without ?token shows an editable token input', async ({ page }) => {
  await page.goto(`${APP_BASE}/reset-password?email=demo@example.com`)
  await expect(page.locator('#token')).toBeVisible()
})

test('/reset-password password-visibility toggle flips input type', async ({ page }) => {
  await page.goto(`${APP_BASE}/reset-password?token=demo&email=demo@example.com`)
  const pwd = page.locator('[data-mol-id="reset-password"]')
  await expect(pwd).toHaveAttribute('type', 'password')
  await page.locator('[data-mol-id="reset-toggle-password"]').click()
  await expect(pwd).toHaveAttribute('type', 'text')
})

test('/reset-password bad token surfaces reset-error alert via captureNetwork', async ({
  page,
}) => {
  // The rejected reset POST legitimately 4xxs — that rejection IS the
  // behavior under test; exempt the console noise BEFORE the submit.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
  await page.goto(`${APP_BASE}/reset-password?token=expired&email=nobody@example.com`)
  await page.locator('[data-mol-id="reset-password"]').fill('NewBogus123!')
  await page.locator('[data-mol-id="reset-confirm"]').fill('NewBogus123!')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="reset-submit"]').click()
    await expect(page.locator('[data-mol-id="reset-error"]')).toBeVisible({ timeout: 10_000 })
  })
  // observation says the form POSTs to /api/users/log-in (the bonded
  // useLogin().login call passes passwordResetToken as the password fallback)
  const calls = reqs.filter((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
  expect(calls.length).toBeGreaterThanOrEqual(1)
  expect(calls.every((c) => c.status >= 400)).toBe(true)
})
