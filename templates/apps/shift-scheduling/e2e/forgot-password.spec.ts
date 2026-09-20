/**
 * /forgot-password — drives the live `usePasswordReset` hook so the form
 * actually POSTs to /api/users/forgot-password and surfaces a "check your
 * inbox" success state.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('forgot-password page', () => {
  test('renders the recovery form heading and email input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link|send/i }).first()).toBeVisible()
  })

  test('submitting the form posts to /api/users/forgot-password and shows the sent state', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot'))
    const reqs = await captureNetwork(page, async () => {
      await Promise.all([
        page.waitForResponse(
          (r) => /\/api\/users\/forgot-password/.test(r.url()) && r.request().method() === 'POST',
          { timeout: 10_000 },
        ),
        page
          .getByRole('button', { name: /send reset link|send/i })
          .first()
          .click(),
      ])
    })
    const post = reqs.find(
      (r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST',
    )
    expect(post?.status, 'forgot-password POST status').toBeLessThan(500)
    await expect(page.getByText(/check|sent|email/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Back-to-sign-in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /back to sign in|sign in/i })
      .first()
      .click()
    await page.waitForURL('**/login', { timeout: 5_000 })
  })
})
