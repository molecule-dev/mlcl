/**
 * /forgot-password — request a reset link via POST /api/users/forgot-password.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('forgot password page', () => {
  test('valid email POST → success message', async ({ page }) => {
    const { email } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input#forgot-email').fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').first().click()
      await expect(page.getByText(/check your inbox/i)).toBeVisible({ timeout: 10000 })
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(post?.status, 'POST forgot-password').toBeLessThan(400)
  })

  test('Back to sign-in link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('initial form renders the email input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input#forgot-email')).toBeVisible()
  })
})
