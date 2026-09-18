import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password: setting a new password from email link', () => {
  test('renders email + password fields and Reset Password button', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token-for-render')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password/i }).first()).toBeVisible()
  })

  test('Submitting without ?token shows the missing-token error', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input[type="email"]').first().fill('reset@flagship.test')
    await page.locator('input[type="password"]').first().fill('NewPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    await expect(page.locator('[data-mol-id="reset-password-error"]').first()).toBeVisible()
  })

  test('Submitting with a token POSTs /api/users/reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=invalid-but-defined')
    await page.locator('input[type="email"]').first().fill('reset@flagship.test')
    await page.locator('input[type="password"]').first().fill('NewPass!1234')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').first().click()
      // Either succeeds (redirect) or surfaces an error — both must hit the API
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => /\/users\/reset-password/.test(r.url) && r.method === 'POST')
    expect(post, 'Reset Password must POST /api/users/reset-password').toBeDefined()
  })

  test('Show/hide password toggle flips input type', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo')
    const pw = page.locator('input#password').first()
    await expect(pw).toHaveAttribute('type', 'password')
    await page
      .getByRole('button', { name: /show password/i })
      .first()
      .click()
    await expect(pw).toHaveAttribute('type', 'text')
  })

  test('Back-to-sign-in and Sign Up links route correctly', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo')
    await expect(page.locator('a[href="/login"]').first()).toBeVisible()
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible()
  })
})
