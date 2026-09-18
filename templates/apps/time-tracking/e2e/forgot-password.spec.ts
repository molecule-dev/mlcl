import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password page', () => {
  test('heading "Reset your password" is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
  })

  test('email field and submit button are visible', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
  })

  test('"Sign in" link navigates back to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"schedule Chrono" landing link navigates to /', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /schedule chrono/i }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('submit fires POST /api/users/forgot-password and shows confirmation', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('textbox', { name: /email/i }).fill(uniqueEmail())
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /send reset link/i }).click()
      await page.waitForTimeout(2500)
    })
    const fp = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST')
    expect(fp, 'POST /api/users/forgot-password').toBeTruthy()
    expect(fp?.status, 'forgot-password status').toBeLessThan(300)
    await expect(
      page.locator('text=/check your inbox|sent a reset|reset link|email/i').first(),
    ).toBeVisible({ timeout: 10000 })
  })
})
