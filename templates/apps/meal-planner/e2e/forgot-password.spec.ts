import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/forgot-password (ForgotPassword)', () => {
  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const inp = page.locator('input[type=email]').first()
    await inp.fill('someone@example.com')
    await expect(inp).toHaveValue('someone@example.com')
  })

  test('Submit POSTs /api/users/forgot-password and shows success banner', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type=email]').first().fill(`forgot-${Date.now()}@example.com`)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /send reset link/i }).click()
      await page.waitForTimeout(1500)
    })
    const call = reqs.find(
      (r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST',
    )
    expect(call, 'POST /api/users/forgot-password fired').toBeTruthy()
    await expect(page.getByRole('status').first()).toBeVisible({ timeout: 8_000 })
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
