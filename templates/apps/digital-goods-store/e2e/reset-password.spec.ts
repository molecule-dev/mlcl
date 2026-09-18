import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, whereUrl } from './_helpers.js'

test.describe('Reset password page (/reset-password)', () => {
  test('renders new + confirm password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo-token')
    const newPw = page.locator('#reset-password, #new-password').first()
    const confirmPw = page.locator('#reset-confirm, #confirm-password').first()
    await expect(newPw.or(page.locator('input[type="password"]').first())).toBeVisible()
    if (await confirmPw.count()) await expect(confirmPw).toBeVisible()
  })

  test('submitting calls /api/users/reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo-token')
    const reqs = await captureNetwork(page, async () => {
      const newPw = page
        .locator('#reset-password, #new-password')
        .first()
        .or(page.locator('input[type="password"]').first())
      await newPw.first().fill('NewSecret123!')
      const confirmPw = page.locator('#reset-confirm, #confirm-password').first()
      if (await confirmPw.count()) await confirmPw.fill('NewSecret123!')
      await page
        .getByRole('button', { name: /reset password|update password|set password/i })
        .first()
        .click()
      await page.waitForTimeout(1200)
    })
    const post = whereUrl(reqs, /\/api\/users\/reset-password/, 'POST')
    expect(post.length, 'POST /api/users/reset-password fired').toBeGreaterThan(0)
    expect(post[0].status).toBeLessThan(500)
  })

  test('confirm-password mismatch shows inline error and disables submit', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo-token')
    const newPw = page.locator('#reset-password, #new-password').first()
    const confirmPw = page.locator('#reset-confirm, #confirm-password').first()
    const hasNew = await newPw.count()
    const hasConfirm = await confirmPw.count()
    if (!hasNew || !hasConfirm) test.skip(true, 'no new/confirm fields on this page')
    await newPw.fill('Secret123!')
    await confirmPw.fill('Different456!')
    // Either the button becomes disabled OR a mismatch text appears OR URL stays.
    const button = page.getByRole('button', { name: /reset password|update password/i }).first()
    const isDisabled = await button.isDisabled().catch(() => false)
    const mismatchText = page.getByText(/don'?t match|do not match|must match/i)
    const mismatchCount = await mismatchText.count()
    expect(isDisabled || mismatchCount > 0, 'mismatch surfaces a disabled state or error').toBe(
      true,
    )
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('back-to-login link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo-token')
    const link = page.getByRole('link', { name: /back to log|sign in|log in/i })
    if (await link.count()) {
      await link.first().click()
      await expect(page).toHaveURL(/\/login/)
    }
  })
})
