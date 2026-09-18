/**
 * /forgot-password — submitting an email triggers the reset endpoint and
 * shows the "check your inbox" success message. Asserts the actual API
 * call was made (no silent UI-only state).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('forgot-password page', () => {
  test('renders email field + submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input#forgot-email')).toBeVisible()
    await expect(page.getByRole('button', { name: /send.*reset.*link|sending/i })).toBeVisible()
  })

  test('submitting an email triggers POST to /api/users/password-reset and shows success', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input#forgot-email').fill('reset-' + Date.now() + '@flagship.test')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /send.*reset.*link/i }).click()
      await expect(page.locator('text=/sent.*reset.*link|inbox|check/i').first()).toBeVisible({
        timeout: 10000,
      })
    })
    const resetReq = reqs.find(
      (r) => /\/api\/users\/.*(password|reset)/i.test(r.url) && r.method === 'POST',
    )
    expect(resetReq, 'POST /api/users/.../password-reset must be issued').toBeTruthy()
    expect(resetReq?.status, 'reset endpoint should not 5xx').toBeLessThan(500)
  })

  test('"Back to sign in" link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('a[href="/login"]').click()
    await page.waitForURL('**/login', { timeout: 5000 })
    await expect(page.locator('input#login-email')).toBeVisible()
  })
})
