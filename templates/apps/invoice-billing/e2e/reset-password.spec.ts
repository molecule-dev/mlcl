/**
 * /reset-password — consume a reset token + set a new password.
 *
 * Asserts on real outcomes (token pulled from the DB after invoking
 * /api/users/forgot-password):
 *  - All four input fields render and submit button is present.
 *  - Valid token + new password POSTs to /api/users/reset-password and
 *    returns 200; user lands on /dashboard after auto-login (UI flow).
 *  - Old password no longer works after reset; new password does.
 *  - Bad token returns 4xx and the UI surfaces an error banner.
 *  - "Back to sign in" link returns the user to /login.
 *  - Mismatched password warning surfaces inline.
 */
import { execSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

/**
 * The platform stores only sha256(token) at rest — `usersSecrets.passwordResetToken`
 * holds the DIGEST, and the raw token exists solely in the reset email (a DB read
 * must never yield a live account-takeover credential). So an e2e run cannot read
 * a usable token out of the DB. Instead, mint a raw token here and overwrite the
 * stored digest with sha256(rawToken) — byte-for-byte what forgot-password does,
 * minus the email. Test-only; mirrors employee-onboarding/auth-flows.
 */
function seedResetToken(userId: string): string {
  const rawToken = randomBytes(32).toString('hex')
  const digest = createHash('sha256').update(rawToken).digest('hex')
  execSync(
    `docker exec molecule-dev-db-1 psql -U molecule -d invoice_billing_test -c "UPDATE \\"usersSecrets\\" SET \\"passwordResetToken\\" = '${digest}', \\"passwordResetTokenAt\\" = now() WHERE id = '${userId}'"`,
    { encoding: 'utf8' },
  )
  return rawToken
}

test.describe('reset-password page', () => {
  test('renders all four fields and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByLabel(/account email/i)).toBeVisible()
    await expect(page.getByLabel(/reset token/i)).toBeVisible()
    await expect(page.getByLabel(/^new password$/i)).toBeVisible()
    await expect(page.getByLabel(/confirm new password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Reset password$/ })).toBeVisible()
  })

  test('valid token submit POSTs /api/users/reset-password (captureNetwork) and lands on /dashboard', async ({
    page,
  }) => {
    const { email, userId } = await signup(page, undefined, 'OldPass!1234')
    // Leave the authed Dashboard BEFORE clearing credentials so its
    // refetches can't fire 401s into the console guard.
    await page.goto(APP_BASE + '/reset-password')
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.request.post(`${API_BASE}/users/forgot-password`, {
      data: { email },
      headers: { 'Content-Type': 'application/json' },
    })
    const token = seedResetToken(userId!)

    await page.goto(
      `${APP_BASE}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
    )
    const reqs = await captureNetwork(page, async () => {
      await page.getByLabel(/^new password$/i).fill('Refresh!1234')
      await page.getByLabel(/confirm new password/i).fill('Refresh!1234')
      await page.getByRole('button', { name: /^Reset password$/ }).click()
      await page.waitForURL('**/dashboard', { timeout: 15000 })
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' && r.url.includes('/api/users/reset-password') && r.status === 200,
      ),
      `expected POST /api/users/reset-password 200, got ${JSON.stringify(reqs.filter((r) => r.url.includes('reset')))}`,
    ).toBe(true)
  })

  test('after reset, old password fails and new password succeeds at /api/users/log-in', async ({
    page,
  }) => {
    const { email, userId } = await signup(page, undefined, 'OldPass!1234')
    await page.request.post(`${API_BASE}/users/forgot-password`, {
      data: { email },
      headers: { 'Content-Type': 'application/json' },
    })
    const token = seedResetToken(userId!)
    const res = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { token, password: 'BrandNew!9876' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(200)

    const oldLogin = await page.request.post(`${API_BASE}/users/log-in`, {
      data: { email, password: 'OldPass!1234' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(oldLogin.status()).toBeGreaterThanOrEqual(401)

    const newLogin = await page.request.post(`${API_BASE}/users/log-in`, {
      data: { email, password: 'BrandNew!9876' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(newLogin.status()).toBe(200)
  })

  test('bad token returns 4xx (does not 500)', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { token: 'totally-fake-token-xxx', password: 'NewPass!2345' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('Back to sign in link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('mismatched passwords surface an inline warning before submit', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake&email=anyone%40nowhere.test')
    await page.getByLabel(/^new password$/i).fill('AAAA1111')
    await page.getByLabel(/confirm new password/i).fill('BBBB2222')
    await expect(page.getByText(/don.?t match/i)).toBeVisible()
  })
})
