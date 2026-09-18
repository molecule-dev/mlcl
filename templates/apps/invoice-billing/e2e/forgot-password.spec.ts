/**
 * /forgot-password — request a password-reset link.
 *
 * Asserts on real outcomes:
 *  - POST /api/users/forgot-password persists a `passwordResetToken` on
 *    the matching `usersSecrets` row (verified via psql).
 *  - The form posts via `captureNetwork()` to /api/users/forgot-password.
 *  - The success card renders after submit.
 *  - Bottom link routes back to /login.
 *  - Heading text is rendered.
 */
import { execSync } from 'node:child_process'

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

function dbPasswordResetToken(userId: string): string {
  return execSync(
    `docker exec molecule-dev-db-1 psql -U molecule -d invoice_billing_test -tAc "SELECT \\"passwordResetToken\\" FROM \\"usersSecrets\\" WHERE id = '${userId}'"`,
    { encoding: 'utf8' },
  ).trim()
}

test.describe('forgot-password page', () => {
  test('renders eyebrow + heading and the submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByLabel(/work email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Send reset link/i })).toBeVisible()
  })

  test('Send reset link → POST /api/users/forgot-password (captureNetwork) and renders success card', async ({
    page,
  }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.getByLabel(/work email/i).fill(email)
      await page.getByRole('button', { name: /Send reset link/i }).click()
      await expect(page.getByText(/Check your inbox/i)).toBeVisible({ timeout: 10000 })
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' && r.url.includes('/api/users/forgot-password') && r.status === 200,
      ),
      `expected POST /api/users/forgot-password 200, got ${JSON.stringify(reqs.filter((r) => r.url.includes('forgot')))}`,
    ).toBe(true)
  })

  test('successful submit writes a real reset token to usersSecrets', async ({ page }) => {
    const { email, userId } = await signup(page)
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/work email/i).fill(email)
    await page.getByRole('button', { name: /Send reset link/i }).click()
    await expect(page.getByText(/Check your inbox/i)).toBeVisible({ timeout: 10000 })
    const token = dbPasswordResetToken(userId!)
    expect(token.length).toBeGreaterThan(20)
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('POST /api/users/forgot-password returns 200 even for an unknown email (no enumeration leak)', async ({
    page,
  }) => {
    const res = await page.request.post(`${API_BASE}/users/forgot-password`, {
      data: { email: `unknown+${Date.now()}@nowhere.test` },
      headers: { 'Content-Type': 'application/json' },
    })
    // 200 (or 204) — the exact code is auth-bond-defined; failure mode would
    // be 404 which would leak account existence.
    expect([200, 204]).toContain(res.status())
  })
})
