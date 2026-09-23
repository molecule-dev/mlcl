// Per-page spec for /reset-password.

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRaw, captureNetwork } from './_helpers.js'

test('Reset-password page renders the email + token + new-password fields', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password')
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
})

test('POST /api/users/reset-password with a junk token returns 4xx', async ({ page }) => {
  // Land on app origin first so apiRaw's localStorage probe is allowed.
  await page.goto(APP_BASE + '/reset-password')
  const resp = await apiRaw(page, 'POST', '/api/users/reset-password', {
    email: 'someone@example.com',
    password: 'NewPass123456!',
    token: 'definitely-not-a-real-token',
  })
  expect(resp.status()).toBeGreaterThanOrEqual(400)
  expect(resp.status()).toBeLessThan(500)
})

test('Reset-password page exposes a "Go back" button that navigates to /login', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/reset-password')
  const backBtn = page.getByRole('button', { name: /go back/i })
  await expect(backBtn).toBeVisible()
  await backBtn.click()
  await page.waitForURL(/\/login$/, { timeout: 10_000 })
  expect(new URL(page.url()).pathname).toBe('/login')
})

test('Submit button on the reset-password form fires POST /api/users/reset-password', async ({
  page,
}) => {
  // The form posts a junk token — the API's 4xx rejection is expected and
  // the browser logs it as a console error.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 4' })
  await page.goto(APP_BASE + '/reset-password')
  // Fields, in order: 1× email, 2× password (1=token, 2=new-password), 1× number (2FA).
  await page.locator('input[type="email"]').first().fill('someone@example.com')
  const pwInputs = page.locator('input[type="password"]')
  await pwInputs.nth(0).fill('definitely-not-a-real-token')
  await pwInputs.nth(1).fill('NewPass123456!')
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /set password.*log in|submit|reset/i })
      .first()
      .click()
    await page.waitForTimeout(2500)
  })
  // Match anywhere in the URL — `r.url` is the full absolute URL including
  // the host, so substring search is what we want here.
  const post = reqs.find((r) => r.method === 'POST' && /\/users\/reset-password/.test(r.url))
  expect(post, 'POST .../users/reset-password fired').toBeTruthy()
})
