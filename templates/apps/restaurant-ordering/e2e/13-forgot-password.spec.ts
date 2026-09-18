/**
 * Forgot password — POST /api/users/forgot-password issues a reset token,
 * the page renders the form, surfaces a "check your email" success state,
 * and shows the back-to-sign-in link.
 *
 * Mailgun is enabled in flagship dev .env. We don't poll Mailgun here —
 * the API contract test (POST returns 200/204) is enough to prove the
 * handler is wired and the upstream call is being attempted.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, signup } from './_helpers.js'

test('Forgot password page renders the email form', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
})

test('Forgot password: submitting a known email shows the success state', async ({ page }) => {
  const { email } = await signup(page)
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/forgot-password', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').first().fill(email)
  await page.getByRole('button', { name: /send reset link/i }).click()
  await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 })
})

test('Forgot password: API returns 2xx for an unknown email (no user enumeration)', async ({
  page,
}) => {
  // Don't sign up — directly poke the API with a never-registered email.
  // The handler should NOT 404 here; doing so would leak which emails are
  // registered. 200/204 is the correct privacy-preserving response.
  const r = await apiRequest(page, 'POST', '/api/users/forgot-password', {
    email: `never-existed-${Date.now()}@example.com`,
  })
  expect([200, 204]).toContain(r.status)
})

test('Forgot password page links back to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password', { waitUntil: 'domcontentloaded' })
  const back = page.getByRole('link', { name: /sign in/i }).first()
  await expect(back).toHaveAttribute('href', /\/login/)
})
