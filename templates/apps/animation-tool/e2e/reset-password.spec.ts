import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password (ResetPassword)', () => {
  test('first password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token')
    const inp = page.locator('input[type=password]').nth(0)
    await inp.fill('NewPa55!')
    await expect(inp).toHaveValue('NewPa55!')
  })

  test('confirm password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token')
    const inp = page.locator('input[type=password]').nth(1)
    await inp.fill('NewPa55!')
    await expect(inp).toHaveValue('NewPa55!')
  })

  test('Reset password submit POSTs the reset endpoint (call must wire through to the backend)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type=password]').nth(0).fill('NewPa55!')
      await page.locator('input[type=password]').nth(1).fill('NewPa55!')
      await page.getByRole('button', { name: /Reset password/i }).click()
      await page.waitForTimeout(2_000)
    })
    // The auth client posts to its configured resetPasswordEndpoint. We just
    // need to know the form actually fires a network call — the backend
    // path under `/api/` may vary (default is /auth/password/reset/confirm).
    const post = reqs.find((r) => /\/api\//.test(r.url) && r.method === 'POST')
    expect(post, 'reset-password form must fire some POST against the backend').toBeTruthy()
  })

  test('Back to sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
