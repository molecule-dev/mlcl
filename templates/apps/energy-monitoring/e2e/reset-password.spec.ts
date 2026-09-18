import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('Reset password /reset-password', () => {
  test('invalid token is rejected (no silent 404)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=not-a-real-token')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill('user@flagship.test')
      // Token field is the first password input on the form (FloatingInput
      // type="password" — see ResetPassword.tsx). Set the value directly.
      await page.locator('input[type="password"]').nth(0).fill('not-a-real-token')
      await page.locator('input[type="password"]').nth(1).fill('NewSecurePass!1')
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(3000)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/reset-password/.test(r.url))
    // Regression: authConfig was missing resetPasswordEndpoint, so the
    // reset call landed on the default `/auth/password/reset/confirm`
    // (which the API doesn't expose) and returned 404. With the per-app
    // override we expect a real POST to /api/users/reset-password.
    expect(post, 'expected POST /api/users/reset-password').toBeTruthy()
    expect(post!.status).toBe(401)
    // User stays on the reset page after a failure; no premature redirect.
    expect(page.url()).toContain('/reset-password')
  })

  test('back arrow returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('button', { name: /back|go back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
