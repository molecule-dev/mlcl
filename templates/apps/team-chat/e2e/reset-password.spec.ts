/**
 * /reset-password — the form posts to /api/users/reset-password with
 * `{ token, password }`. We can't roundtrip a real reset without a
 * mailbox, so the spec asserts on form rendering, the network call,
 * and the invalid-token error path.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE } from './_helpers.js'

test.describe('reset-password page', () => {
  test('renders new + confirm password fields and a submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token')
    const pwInputs = page.locator('input[type="password"]')
    await expect(pwInputs.first()).toBeVisible()
    await expect(pwInputs.nth(1)).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password/i }).first()).toBeVisible()
  })

  test('submits new password to /api/users/reset-password', async ({ page }) => {
    // An invalid token 401s — that IS the path exercised here; allow the
    // console noise the browser makes for the failed fetch.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
    const requests: { method: string; url: string }[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/users/reset-password')) {
        requests.push({ method: req.method(), url: req.url() })
      }
    })
    await page.goto(APP_BASE + '/reset-password?token=invalid-fake-token')
    const pwInputs = page.locator('input[type="password"]')
    await pwInputs.first().fill('NewPass123!')
    await pwInputs.nth(1).fill('NewPass123!')
    await page
      .getByRole('button', { name: /reset password/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
    expect(requests.some((r) => r.method === 'POST')).toBeTruthy()
  })

  test('invalid token returns 4xx from API', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { token: 'definitely-not-a-real-token-' + Date.now(), password: 'Pass123456!' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })
})
