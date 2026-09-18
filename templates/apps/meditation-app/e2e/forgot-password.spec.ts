/**
 * /forgot-password — request a reset link. Asserts the email input,
 * the POST /api/forgot_password call, and the back-to-login link.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('forgot password (/forgot-password)', () => {
  test('renders the email input and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('submitting fires POST /api/users/forgot-password and stays on the page', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input[type="email"]').fill('forgotten@meditation.test')
      await page.locator('button[type="submit"]').click()
      await page.waitForTimeout(2000)
    })
    await expect(page).toHaveURL(/forgot-password/)
    const calls = reqs.filter(
      (r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST',
    )
    expect(
      calls.length,
      JSON.stringify(reqs.map((r) => `${r.method} ${r.url} ${r.status}`)),
    ).toBeGreaterThan(0)
  })

  test('back-to-login link returns the user to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.waitForLoadState('networkidle')
    await page
      .getByRole('link', { name: /back to sign in|sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
