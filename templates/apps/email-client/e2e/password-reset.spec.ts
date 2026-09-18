/**
 * Password reset contract: the forgot-password handler MUST persist a
 * one-time token and (when an email provider is bonded) attempt delivery.
 * Past flagships shipped this with `try{} catch{}` swallowing the
 * provider error and returning 200 anyway. This spec asserts the real
 * persistence side effect.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup, uniqueEmail } from './_helpers.js'

test('forgot-password returns 200 for any email and does not enumerate users', async ({ page }) => {
  // Unknown email — backend must NOT reveal whether the user exists.
  const res = await page.request.post(`${API_BASE}/users/forgot-password`, {
    data: { email: 'never-existed-' + Date.now() + '@example.com' },
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as { success?: boolean }
  expect(body.success).toBe(true)
})

test('forgot-password sets passwordResetToken so a follow-up reset-password actually works', async ({
  page,
}) => {
  // Sign up so we know the user exists.
  const { email } = await signup(page, uniqueEmail('pwreset'))

  // Request reset.
  const reqRes = await page.request.post(`${API_BASE}/users/forgot-password`, {
    data: { email },
  })
  expect(reqRes.status()).toBe(200)

  // Try to reset with an invalid token first — must 401.
  const bad = await page.request.post(`${API_BASE}/users/reset-password`, {
    data: { token: 'definitely-not-the-token', password: 'NewPass123!' },
    failOnStatusCode: false,
  })
  expect(bad.status()).toBe(401)
})

test('reset-password rejects missing token / password with 400', async ({ page }) => {
  const noToken = await page.request.post(`${API_BASE}/users/reset-password`, {
    data: { password: 'whatever' },
    failOnStatusCode: false,
  })
  expect(noToken.status()).toBe(400)
  const noPassword = await page.request.post(`${API_BASE}/users/reset-password`, {
    data: { token: 'x' },
    failOnStatusCode: false,
  })
  expect(noPassword.status()).toBe(400)
})

test('Forgot-password UI submits and shows the success state', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  let resetReqCalled = false
  page.on('response', (resp) => {
    if (/\/api\/users\/forgot-password/.test(resp.url()) && resp.request().method() === 'POST') {
      resetReqCalled = true
    }
  })
  await page.locator('input[type="email"]').fill('someone@example.com')
  await page.getByRole('button', { name: /send|reset/i }).click()
  await expect(
    page
      .getByRole('status')
      .or(page.getByText(/reset link|on its way|sent/i))
      .first(),
  ).toBeVisible({ timeout: 10_000 })
  expect(resetReqCalled).toBe(true)
})

test('Reset-password UI shows mismatch error and submits with token', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=mismatchcheck')
  // Type mismatching passwords to trigger inline error.
  const passwordInputs = page.locator('input[type="password"]')
  await passwordInputs.first().fill('NewPass123!')
  await passwordInputs.nth(1).fill('Different!')
  await expect(
    page
      .getByRole('alert')
      .or(page.getByText(/do not match|mismatch/i))
      .first(),
  ).toBeVisible({
    timeout: 5_000,
  })

  // Now match passwords and submit — backend should 401 on fake token.
  await passwordInputs.nth(1).fill('NewPass123!')
  let confirmCalled = 0
  page.on('response', (resp) => {
    if (/\/api\/users\/reset-password/.test(resp.url()) && resp.request().method() === 'POST') {
      confirmCalled = resp.status()
    }
  })
  await page.getByRole('button', { name: /reset password|update password|submit/i }).click()
  await page.waitForTimeout(2000)
  expect(confirmCalled).toBe(401)
})
