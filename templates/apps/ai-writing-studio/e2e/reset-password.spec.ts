/**
 * /reset-password — completes the forgot-password flow.
 *
 * Without a token, submit shows "Invalid or expired" alert. Mismatched
 * passwords show the mismatch alert. We can't simulate the real token
 * without intercepting Mailgun, but we assert the form's local validation
 * and that the back link routes correctly.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders Set a new password heading', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('heading', { name: /Set a new password/i })).toBeVisible()
  })

  test('new-password input is masked', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const pw = page.getByLabel(/^New password$/i)
    await pw.fill('NewPass123!')
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('confirm-password input is masked', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const c = page.getByLabel(/Confirm password/i)
    await c.fill('NewPass123!')
    await expect(c).toHaveAttribute('type', 'password')
  })

  test('without ?token=, submitting fires no /log-in call (HTML5 required-validation blocks empty submit) and the page stays', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Reset password/i }).click()
      // Browser HTML5 validation will block submit because required fields are empty.
    })
    const logIn = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(logIn, 'no log-in POST should fire when fields fail HTML5 validation').toBeFalsy()
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('Back to sign in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
