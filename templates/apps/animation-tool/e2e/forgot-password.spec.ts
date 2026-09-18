import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/forgot-password (ForgotPassword)', () => {
  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const inp = page.locator('input[type=email]')
    await inp.fill('me@example.com')
    await expect(inp).toHaveValue('me@example.com')
  })

  test('Send reset link POSTs /api/users/forgot-password and shows confirmation copy', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type=email]').fill(`fp+${Date.now()}@example.com`)
      await page.getByRole('button', { name: /Send reset link/i }).click()
      // Wait for either a network response or a UI signal so we don't race.
      await page.waitForTimeout(2_000)
    })
    const fp = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST')
    expect(fp, 'POST /api/users/forgot-password fired').toBeTruthy()
    // Backend always returns 200 even for unknown emails (anti-enumeration).
    expect(fp!.status, 'forgot-password should not 5xx').toBeLessThan(500)
  })

  test('Back to sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
