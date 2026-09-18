/**
 * /reset-password — the form posts to /api/users/reset-password with
 * `{ token, password }`. We can't roundtrip a real reset without a
 * mailbox, so the spec asserts on form rendering, the network call,
 * and the invalid-token error path.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork } from './_helpers.js'

test.describe('reset-password page', () => {
  test('renders email + token + password fields and a submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=test-token&email=foo@bar.com')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    const pwInputs = page.locator('input[type="password"]')
    await expect(pwInputs.first()).toBeVisible()
    await expect(pwInputs.nth(1)).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password/i }).first()).toBeVisible()
  })

  test('submits new password to /api/users/reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=invalid-fake-token&email=foo@bar.com')
    const pwInputs = page.locator('input[type="password"]')
    await pwInputs.first().fill('NewPass123!')
    await pwInputs.nth(1).fill('NewPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset password/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => r.method === 'POST' && /\/api\/users\/reset-password/.test(r.url)),
    ).toBeTruthy()
  })

  test('invalid token returns 4xx from API', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: { token: 'definitely-not-a-real-token-' + Date.now(), password: 'Pass123456!' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('mismatched passwords show inline error and skip the API call', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=mismatch-token&email=foo@bar.com')
    const pwInputs = page.locator('input[type="password"]')
    await pwInputs.first().fill('FirstPass1!')
    await pwInputs.nth(1).fill('SecondPass1!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset password/i })
        .first()
        .click()
      await page.waitForTimeout(800)
    })
    expect(reqs.some((r) => /\/api\/users\/reset-password/.test(r.url))).toBeFalsy()
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('"Back to sign in" link points to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const link = page.locator('a[href="/login"]').first()
    await expect(link).toHaveAttribute('href', '/login')
  })

  test('email + token query params prefill the inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=preset-token-xyz&email=prefill%40example.com')
    await expect(page.locator('input[type="email"]').first()).toHaveValue('prefill@example.com')
    const tokenInput = page.locator('input[type="text"]').first()
    await expect(tokenInput).toHaveValue('preset-token-xyz')
  })
})
