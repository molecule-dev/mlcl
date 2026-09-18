/**
 * Forgot-password / reset-password lifecycle.
 *
 * Verifies the full round-trip with real Mailgun (sandbox) integration:
 * sign up → POST /api/users/forgot-password → DB token written → POST
 * /api/users/log-in with passwordResetToken → can log in with new
 * password.
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
  let token = ''
  try {
    // forgot-password writes the token into "usersSecrets" (id = user.id).
    const rows = await client.query<{ password_reset_token: string | null }>(
      `SELECT s."passwordResetToken" AS password_reset_token
         FROM users u
         JOIN "usersSecrets" s ON s.id = u.id
        WHERE u.email = $1`,
      [email],
    )
    token = rows.rows[0]?.password_reset_token ?? ''
  } finally {
    await client.end()
  }
  expect(
    token,
    'forgot-password handler must write a passwordResetToken to usersSecrets',
  ).toBeTruthy()

  const newPassword = 'NewPass456!'
  // /users/reset-password persists the new passwordHash and clears the
  // reset token. /users/log-in alone with a token authenticates but does
  // NOT change the stored password.
  const reset = await page.request.post(`${API_BASE}/users/reset-password`, {
    data: { token, password: newPassword },
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
