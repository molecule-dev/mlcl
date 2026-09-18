import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers'

// /forgot-password: single email field + Send Reset Link. POSTs to the
// auth bond's reset-request endpoint (which the api/users handler maps to
// /api/users/forgotPassword). Success swaps the form for the "check your
// email" panel.

test.describe('/forgot-password', () => {
  test('email input editable', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('textbox', { name: /email/i }).fill('me@example.com')
    await expect(page.getByRole('textbox', { name: /email/i })).toHaveValue('me@example.com')
  })

  test('submitting fires a POST to the password-reset endpoint', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('textbox', { name: /email/i }).fill('does-not-exist@example.com')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /send reset link/i }).click()
      // success panel is the source of truth — it appears regardless of
      // whether the email exists (no enumeration leak).
      await page
        .getByText(/check your email|reset link to/i)
        .first()
        .waitFor({ timeout: 15_000 })
    })
    const resetCall = reqs.find((r) => /\/api\/users\b/.test(r.url) && r.method === 'POST')
    expect(resetCall, 'POST to password-reset request endpoint should fire').toBeTruthy()
    expect(resetCall!.status).toBeLessThan(500)
  })

  test('after submit the success state is shown', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()
    await expect(page.getByText(/reset link to/i)).toBeVisible({ timeout: 15_000 })
  })
})
