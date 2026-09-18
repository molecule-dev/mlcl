import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password (ResetPassword)', () => {
  test('new-password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const inp = page.locator('input[name=password]').first()
    await inp.fill('NewPa55word!')
    await expect(inp).toHaveValue('NewPa55word!')
  })

  test('confirm-password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const inp = page.locator('input[name=confirmPassword]').first()
    await inp.fill('NewPa55word!')
    await expect(inp).toHaveValue('NewPa55word!')
  })

  test('Submit without token surfaces an inline error banner', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input[name=password]').fill('NewPa55word!')
    await page.locator('input[name=confirmPassword]').fill('NewPa55word!')
    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText(/reset link is invalid|expired/i).first()).toBeVisible({
      timeout: 8_000,
    })
  })

  test('Submit with token POSTs /api/users/reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=does-not-exist-xyz')
    await page.locator('input[name=password]').fill('AnyPa55word!')
    await page.locator('input[name=confirmPassword]').fill('AnyPa55word!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /reset password/i }).click()
      await page.waitForTimeout(1500)
    })
    const call = reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST')
    expect(call, 'POST /api/users/reset-password fired').toBeTruthy()
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
