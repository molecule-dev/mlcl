/**
 * /reset-password — confirm a password reset.
 *
 * Real outcomes asserted:
 *   - the form renders the new + confirm password fields
 *   - mismatched passwords surface an inline error and skip the API
 *   - posting to the reset endpoint with an invalid token shows the
 *     server-rejection error
 *   - the full happy-path flow: signup → request reset (yields a token
 *     that we read from the database) → submit reset form → verify
 *     redirect to /login → log in with the new password
 *     (read-after-write end-to-end)
 *
 * Token retrieval needs the `usersSecrets` row written by the
 * forgotPassword handler, which we read out of the running Postgres
 * container. The smoke app + the polish-v2 dev rig both run Postgres
 * in `molecule-dev-db-1`, so we shell into it.
 */

import { execSync } from 'node:child_process'
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers'

function readResetToken(userId: string): string | null {
  // Postgres downcases unquoted identifiers — usersSecrets must stay
  // quoted. We pipe the SQL via stdin to avoid juggling shell quotes.
  const sql = `SELECT "passwordResetToken" FROM "usersSecrets" WHERE id = '${userId}';`
  const out = execSync(
    `docker exec -i molecule-dev-db-1 psql -U molecule -d rental_marketplace_test -At`,
    { input: sql, encoding: 'utf8' },
  )
  const trimmed = out.trim()
  return trimmed || null
}

test('reset-password page renders both password inputs', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=anything')
  await expect(page.getByRole('heading', { name: /set a new password/i })).toBeVisible()
  const pws = page.locator('input[type="password"]')
  await expect(pws).toHaveCount(2)
  await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
})

test('mismatched passwords show inline error and skip the API call', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=ignored')
  const pws = page.locator('input[type="password"]')
  await pws.nth(0).fill('one-password-xx')
  await pws.nth(1).fill('different-pw-yy')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /reset password/i }).click()
    await page.waitForTimeout(500)
  })
  expect(reqs.find((r) => r.url.includes('/api/users/reset-password'))).toBeUndefined()
  await expect(page.getByText(/passwords don't match/i)).toBeVisible()
})

test('invalid token surfaces a server error', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=clearly-not-real-token')
  const pws = page.locator('input[type="password"]')
  await pws.nth(0).fill('NewPass123!')
  await pws.nth(1).fill('NewPass123!')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /reset password/i }).click()
    await page.waitForTimeout(2000)
  })
  const post = reqs.find((r) => r.url.includes('/api/users/reset-password') && r.method === 'POST')
  expect(post, 'POST /api/users/reset-password should fire').toBeTruthy()
  expect(post!.status).toBeGreaterThanOrEqual(400)
  expect(post!.status).toBeLessThan(500)
})

test('happy path: signup → request reset → submit form → log in with new password', async ({
  page,
  browser,
}) => {
  // Step 1: sign up via UI so we have a known email + password.
  const { email, password } = await signup(page)
  // Find the userId via the live API.
  const me = await page.request.get(`${API_BASE}/users/me`)
  const meBody = (await me.json()) as {
    id?: string
    props?: { id?: string }
    user?: { id?: string }
  }
  const userId = meBody.id ?? meBody.props?.id ?? meBody.user?.id
  expect(userId).toBeTruthy()

  // Step 2: request a password reset link via API directly.
  const forgot = await page.request.post(`${API_BASE}/users/forgot-password`, {
    data: { email },
  })
  expect(forgot.ok()).toBe(true)

  // Step 3: read the reset token off the secrets table.
  const token = readResetToken(userId!)
  expect(token, 'expected the forgotPassword handler to write a reset token').toBeTruthy()
  expect(token!.length).toBeGreaterThan(8)

  // Step 4: visit the reset form and submit a new password.
  const newPassword = 'BrandNewPass456!'
  await page.goto(APP_BASE + `/reset-password?token=${token}`)
  const pws = page.locator('input[type="password"]')
  await pws.nth(0).fill(newPassword)
  await pws.nth(1).fill(newPassword)
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /reset password/i }).click()
    await page.waitForURL(/\/login(?:[/?#].*)?$/, { timeout: 10000 })
  })
  const post = reqs.find((r) => r.url.includes('/api/users/reset-password') && r.method === 'POST')
  expect(post?.status).toBe(200)

  // Step 5: read-after-write — old password rejected, new password works.
  const fresh = await browser.newContext()
  const freshPage = await fresh.newPage()
  // Old password should fail.
  const wrong = await freshPage.request.post(`${API_BASE}/users/log-in`, {
    data: { email, password },
  })
  expect(wrong.ok()).toBe(false)
  // New password should succeed.
  const right = await freshPage.request.post(`${API_BASE}/users/log-in`, {
    data: { email, password: newPassword },
  })
  expect(right.ok()).toBe(true)
  await fresh.close()
})
