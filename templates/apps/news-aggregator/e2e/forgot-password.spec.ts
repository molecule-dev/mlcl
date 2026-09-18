/**
 * Per-page coverage for /forgot-password. Cross-references e2e/observations/forgot-password.md.
 * Detailed flow lives in 09-auth-recovery.spec.ts.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders the heading and email input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.getByLabel(/email/i).first()).toBeVisible()
  })

  test('submitting the form posts to the password-reset endpoint', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = uniqueEmail('na-forgot-page')
    await page.getByLabel(/email/i).first().fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset|send|submit|email me/i })
        .first()
        .click()
      await expect(page.getByText(/check your email|reset link/i).first()).toBeVisible({
        timeout: 10_000,
      })
    })
    expect(reqs.some((r) => /(reset|forgot|recover)/i.test(r.url) && r.method === 'POST')).toBe(
      true,
    )
  })

  test('"Back to sign in" navigates back to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/email/i).first().fill('back-to-signin@example.com')
    await page
      .getByRole('button', { name: /reset|send|submit|email me/i })
      .first()
      .click()
    await expect(page.getByText(/check your email|reset link/i).first()).toBeVisible()
    await page
      .getByRole('button', { name: /back to sign in|sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
