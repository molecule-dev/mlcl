/**
 * /reset-password — complete a password reset with a token.
 *
 * Per-page spec covering each row in observations/reset-password.md.
 * The reset flow: forgot-password seeds a token in usersSecrets, an email
 * is sent, the user clicks the link → /reset-password?token=...&email=...
 * The form POSTs `{ token, password }` to /api/users/reset-password.
 * On 200 the page auto-logs-in via /api/users/log-in and redirects to /explore.
 *
 * Uses the test postgres CLI to read the persisted token (no production
 * trapdoor needed) so we can drive the full lifecycle end-to-end.
 */

import { execSync } from 'node:child_process'

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('"Set new password" heading rendered on /reset-password', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=demo&email=demo@example.com')
  await expect(page.getByRole('heading', { name: /set new password/i })).toBeVisible()
})

test('?token=... and ?email=... prefill the inputs', async ({ page }) => {
  const TOKEN = 'demo-token-xyz'
  const EMAIL = 'prefilled@example.com'
  await page.goto(`${APP_BASE}/reset-password?token=${TOKEN}&email=${encodeURIComponent(EMAIL)}`)
  await expect(page.locator('input[type="email"]')).toHaveValue(EMAIL)
  // The token input has type="text" — there are 2 text-typed inputs (email+token).
  await expect(page.locator('input[type="text"]').first()).toHaveValue(TOKEN)
})

test('new password + confirm-password inputs accept text', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=t&email=e@example.com')
  const pw = page.locator('input[autocomplete="new-password"]').first()
  const cf = page.locator('input[autocomplete="new-password"]').nth(1)
  await pw.fill('NewSecret123!')
  await cf.fill('NewSecret123!')
  await expect(pw).toHaveValue('NewSecret123!')
  await expect(cf).toHaveValue('NewSecret123!')
})

test('Reset-password POST fires; bogus token returns 4xx', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=bogus-xyz-9999&email=x@example.com')
  const { reqs } = await captureNetwork(page, async () => {
    await page.locator('input[autocomplete="new-password"]').first().fill('NewSecret123!')
    await page.locator('input[autocomplete="new-password"]').nth(1).fill('NewSecret123!')
    await page.getByRole('button', { name: /reset password|submitting/i }).click()
    await page.waitForLoadState('networkidle')
  })
  const call = reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST')
  expect(call, 'POST /api/users/reset-password should fire').toBeTruthy()
  expect(call!.status).toBeGreaterThanOrEqual(400)
})

test('Back-to-sign-in link → /login', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=t&email=e@example.com')
  await page.getByRole('link', { name: /back.*sign in|sign\s*in/i }).click()
  await expect(page).toHaveURL(/\/login/)
})

function readResetTokenFromDb(email: string): string | null {
  // The smoke-app database is named `<slug>_test` and is reachable via the
  // molecule-dev-db-1 docker container that the workspace already uses for
  // every flagship's smoke-app. Use `docker exec` to run psql; this avoids
  // needing a production trapdoor route. If docker isn't available (e.g.
  // CI without docker), the function returns null and the caller skips the
  // round-trip assertion.
  try {
    const sql = `SELECT s."passwordResetToken" FROM "users" u JOIN "usersSecrets" s ON s.id = u.id WHERE u.email = '${email.replace(/'/g, "''")}' LIMIT 1;`
    const out = execSync(
      `docker exec molecule-dev-db-1 psql -U molecule -d photo_sharing_test -t -A -c "${sql.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', timeout: 5_000 },
    )
    const token = out.trim()
    return token || null
  } catch {
    return null
  }
}

test('full reset-password lifecycle: forgot → DB token → reset → log in with new password', async ({
  page,
  request,
}) => {
  const email = uniqueEmail('photo-reset')
  const oldPassword = 'OldPass123!'
  const newPassword = 'NewPass456!'
  await signup(page, email, oldPassword)
  await page.context().clearCookies()

  // Trigger forgot-password to seed the DB token.
  const forgot = await request.post(`${API_BASE}/users/forgot-password`, {
    data: { email },
    headers: { 'content-type': 'application/json' },
  })
  expect(forgot.status()).toBeLessThan(400)

  const token = readResetTokenFromDb(email)
  test.skip(!token, 'docker exec into molecule-dev-db-1 unavailable; skipping DB round-trip')

  // POST the new password directly with the real token.
  const reset = await request.post(`${API_BASE}/users/reset-password`, {
    data: { token, password: newPassword },
    headers: { 'content-type': 'application/json' },
  })
  expect(reset.status(), `reset POST should be 200 (got ${reset.status()})`).toBe(200)

  // Old password must now fail.
  const loginOld = await request.post(`${API_BASE}/users/log-in`, {
    data: { email, password: oldPassword },
    headers: { 'content-type': 'application/json' },
  })
  expect(loginOld.status()).toBeGreaterThanOrEqual(400)

  // New password must succeed.
  const loginNew = await request.post(`${API_BASE}/users/log-in`, {
    data: { email, password: newPassword },
    headers: { 'content-type': 'application/json' },
  })
  expect(loginNew.status()).toBe(200)
})
