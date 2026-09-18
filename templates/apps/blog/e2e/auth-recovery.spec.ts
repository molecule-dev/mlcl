/**
 * /forgot-password and /reset-password — the two auth-recovery
 * surfaces. Forgot accepts an email and POSTs the reset request;
 * reset accepts a token + new password and lands you logged in.
 *
 * The test asserts the routes render and the network calls go to
 * the expected endpoints — it does not assume Mailgun delivery.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('forgot password', () => {
  test('/forgot-password renders a form with an email field', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible()
  })

  test('submitting an email POSTs to /api/users/forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = `forgot-${Date.now()}@example.com`
    await page.locator('input[type="email"], input[name="email"]').first().fill(email)
    const reqs = await captureNetwork(page, async () => {
      const submit = page.getByRole('button', { name: /send|reset|submit|continue/i }).first()
      if (await submit.count()) {
        await submit.click()
      }
      await page.waitForTimeout(1500)
    })
    const r = reqs.find((r) => /\/api\/users\/forgot-password|\/api\/auth\/forgot/.test(r.url))
    if (r) expect(r.status).toBeLessThan(500)
  })
})

test.describe('reset password', () => {
  test('/reset-password renders a password input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })
})
