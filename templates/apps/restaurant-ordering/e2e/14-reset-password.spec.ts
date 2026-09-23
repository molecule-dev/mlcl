/**
 * Reset password — full forgot → reset round-trip via the API. Verifies
 * the new password actually authenticates afterward (read-after-write
 * proof — the reset endpoint isn't a no-op).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, signup } from './_helpers.js'

test('Reset password page renders the new-password form', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?email=&token=', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /set a new password/i })).toBeVisible()
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.locator('input#token')).toBeVisible()
  await expect(page.locator('input#password')).toBeVisible()
})

test('Reset password page pre-fills from query params', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?email=foo@example.com&token=abc-123', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('input[type="email"]').first()).toHaveValue('foo@example.com')
  await expect(page.locator('input#token')).toHaveValue('abc-123')
})

test('Reset password: invalid token surfaces an error', async ({ page }) => {
  const r = await apiRequest<{ error?: string }>(page, 'POST', '/api/users/reset-password', {
    token: 'bogus-token-' + Date.now(),
    password: 'WhateverNewPass1!',
  })
  // The handler MUST reject an unknown token (4xx). Returning 200 here
  // would mean any unauthenticated POST could blank a user's password.
  expect(r.status).toBeGreaterThanOrEqual(400)
  expect(r.status).toBeLessThan(500)
})

test('Reset password: end-to-end reset flow lets the user log in with the new password', async ({
  page,
}) => {
  // Clearing localStorage below logs the session out while the app shell is
  // still mounted, so the next /api/users/me probe 401s — expected noise.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: 'status of 401',
  })
  const { email } = await signup(page)
  // Ask for a reset, then read the most recent token from the API.
  const reqRes = await apiRequest<{ token?: string }>(page, 'POST', '/api/users/forgot-password', {
    email,
  })
  expect([200, 204]).toContain(reqRes.status)

  // The dev-only debug endpoint (NODE_ENV !== 'production') returns the
  // most recent reset token issued for the given email. This is how we
  // simulate the email-delivered token handoff without a real inbox.
  const tokenLookup = await apiRequest<{ token?: string }>(
    page,
    'GET',
    `/api/users/reset-token?email=${encodeURIComponent(email)}`,
  )
  expect(
    tokenLookup.status,
    'dev-mode /users/reset-token must expose the freshly issued token',
  ).toBe(200)
  const token = tokenLookup.body?.token ?? reqRes.body?.token
  expect(token, 'reset token must be present after forgot-password').toBeTruthy()

  const newPass = 'NewKitchenPass1!'
  const confirm = await apiRequest(page, 'POST', '/api/users/reset-password', {
    token,
    password: newPass,
  })
  expect([200, 204]).toContain(confirm.status)

  // Now log in with the NEW password (read-after-write proof).
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(newPass)
  await page
    .getByRole('button', { name: /sign in/i })
    .first()
    .click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
})
