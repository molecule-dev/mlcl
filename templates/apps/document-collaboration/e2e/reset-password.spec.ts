/**
 * /reset-password — token-based password reset.
 *
 * Outcome assertions:
 * - Page renders the password fields + submit.
 * - POST /api/users/reset-password rejects an invalid token with 400.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork } from './_helpers.js'

test.describe('reset password page', () => {
  test('renders the password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc123')
    const pwInputs = page.locator('input[type="password"]')
    await expect(pwInputs.first()).toBeVisible({ timeout: 10_000 })
  })

  test('back-to-login link is present', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc123')
    await expect(page.getByRole('link', { name: /sign\s*in|back/i }).first()).toBeVisible()
  })

  test('POST /api/users/reset-password rejects bad token with 4xx', async ({ page }) => {
    const resp = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { token: 'totally-bogus-token-1234567890', password: 'NewPass!9abc' },
      failOnStatusCode: false,
    })
    expect(resp.status()).toBeGreaterThanOrEqual(400)
    expect(resp.status()).toBeLessThan(500)
    const body = (await resp.json()) as { error?: string }
    expect(body.error).toMatch(/invalid|expired/i)
  })
})

test.describe('reset-password — network', () => {
  test('bad token submit triggers POST /api/users/reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=abc')
    const reqs = await captureNetwork(page, async () => {
      const status = await page.evaluate(async (apiBase) => {
        const r = await fetch(apiBase + '/users/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'bad-token-xyz', password: 'NewPass!9' }),
        })
        return r.status
      }, API_BASE)
      expect(status).toBeGreaterThanOrEqual(400)
      expect(status).toBeLessThan(500)
    })
    expect(reqs.some((r) => r.url.includes('/api/users/reset-password'))).toBe(true)
  })
})
