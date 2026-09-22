import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password page', () => {
  test('Email textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input[type="email"]').first().fill('reset@example.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('reset@example.com')
  })

  test('Reset token textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const token = page.getByRole('textbox', { name: /reset token/i }).first()
    await token.fill('demo-token-123')
    expect(await token.inputValue()).toBe('demo-token-123')
  })

  test('New password textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const pw = page.locator('input[type="password"]').first()
    await pw.fill('NewSecurePass!2026')
    expect(await pw.inputValue()).toBe('NewSecurePass!2026')
  })

  test('Reset Password button submits the form (network attempt fires)', async ({ page }) => {
    // The bogus demo token 401s by design — the guard would otherwise fail
    // the test on the browser's "Failed to load resource" console error.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input[type="email"]').first().fill('reset@example.com')
    await page
      .getByRole('textbox', { name: /reset token/i })
      .first()
      .fill('demo-token-123')
    await page.locator('input[type="password"]').first().fill('NewSecurePass!2026')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset password/i })
        .first()
        .click()
      await page.waitForTimeout(2000)
    })
    // Just assert the click triggers SOME backend POST (the auth client hits
    // /auth/password/reset/confirm by default — token validation will 4xx
    // since demo-token-123 isn't real, but the call must happen, otherwise
    // the form is broken). We accept any POST here so the test stays robust
    // across endpoint config changes.
    const post = reqs.find((r) => r.method === 'POST')
    expect(post, 'a POST should fire on submit').toBeTruthy()
  })
})
