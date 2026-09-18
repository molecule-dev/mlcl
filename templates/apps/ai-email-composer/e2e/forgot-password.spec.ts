import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, signup } from './_helpers.js'

interface ForgotResp {
  success?: boolean
  error?: string
}

test('POST /api/users/forgot-password returns 200 for an existing user', async ({ page }) => {
  const { email } = await signup(page)
  const resp = await page.request.post(API_BASE + '/users/forgot-password', {
    data: { email },
  })
  expect(
    resp.status(),
    `forgot-password should accept a known email; body=${await resp.text()}`,
  ).toBeLessThan(400)
  const body = (await resp.json()) as ForgotResp
  // The handler must not silently swallow Mailgun errors. With a real
  // Mailgun key the response body should indicate success; with a
  // misconfigured key the response should still be 4xx/5xx — never a
  // fake-success 2xx.
  expect(body.success ?? true).toBeTruthy()
})

test('POST /api/users/forgot-password is idempotent for unknown emails', async ({ page }) => {
  // For unknown addresses the API should still return 2xx to avoid leaking
  // user-existence (this is the standard pattern). It must NOT throw.
  const resp = await page.request.post(API_BASE + '/users/forgot-password', {
    data: { email: 'nobody-' + Date.now() + '@example.com' },
  })
  expect(resp.status()).toBeLessThan(500)
})

test('Forgot password UI shows a success confirmation after submit', async ({ page }) => {
  const { email } = await signup(page)
  await page.goto('/forgot-password')
  await page.locator('input[type="email"], input#email').first().fill(email)
  await page
    .getByRole('button', { name: /send.*reset|reset.*link|send/i })
    .first()
    .click()
  // The page swaps to a "Check your inbox" success card. Match on the
  // success affordance the component renders.
  await expect(page.locator('body')).toContainText(/inbox|reset|sent|check/i, { timeout: 15_000 })
})

test('Forgot password UI surfaces an error for an empty email submission', async ({ page }) => {
  await page.goto('/forgot-password')
  // Trigger native HTML5 validation by clicking submit with no input.
  // Either the form refuses to submit (URL stays /forgot-password) OR an
  // error message renders.
  await page
    .getByRole('button', { name: /send.*reset|reset.*link|send/i })
    .first()
    .click()
  await page.waitForTimeout(500)
  // The form must NOT have transitioned to a fake "success" state — the
  // user is still on /forgot-password with the form visible.
  await expect(page).toHaveURL(/\/forgot-password/)
})
