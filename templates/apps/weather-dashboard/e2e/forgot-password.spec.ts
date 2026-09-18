// Per-page spec for /forgot-password.

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRaw, captureNetwork, signup } from './_helpers.js'

test('Forgot-password form renders an email field and a submit button', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /(submit|send|reset)/i }).first()).toBeVisible()
})

test('Submitting with a real email POSTs /api/users/forgot-password and stays 2xx', async ({
  page,
}) => {
  const { email } = await signup(page)
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/forgot-password')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input[type="email"]').fill(email)
    await page
      .getByRole('button', { name: /(submit|send|reset)/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url))
  expect(post, 'forgot-password POST should fire').toBeDefined()
  expect(post!.status).toBeLessThan(300)
})

test('Submitting with an unknown email also returns 200 (anti-enumeration)', async ({ page }) => {
  // Always-2xx contract — never tell the caller whether the email exists.
  // Land on app origin first so localStorage is readable for apiRaw's
  // `getAccessToken` probe (no token here — that's the point).
  await page.goto(APP_BASE + '/forgot-password')
  const resp = await apiRaw(page, 'POST', '/api/users/forgot-password', {
    email: 'definitely-does-not-exist-anywhere@example.invalid',
  })
  expect(resp.status()).toBeLessThan(300)
})

test('Forgot-password page exposes a "Go back" button that navigates to /login', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/forgot-password')
  const backBtn = page.getByRole('button', { name: /go back/i })
  await expect(backBtn).toBeVisible()
  await backBtn.click()
  await page.waitForURL(/\/login$/, { timeout: 10_000 })
  expect(new URL(page.url()).pathname).toBe('/login')
})
