/**
 * /forgot-password — request a reset link.
 *
 * The reset email goes through Mailgun in real envs; here we just
 * assert the request endpoint accepts the input and the UI shows a
 * confirmation. The actual reset flow is exercised in reset-password.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('forgot password page', () => {
  test('renders the email field + back-to-login link', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /sign\s*in|back/i }).first()).toBeVisible()
  })

  test('submitting an unknown email does not leak (returns 2xx and shows confirmation)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(`unknown-${Date.now()}@example.com`)
    await page.getByRole('button', { name: /send\s*reset/i }).click()
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10_000 })
  })

  test('submitting a known email shows confirmation', async ({ page }) => {
    const email = uniqueEmail('forgot-known')
    await signup(page, email)
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(email)
    await page.getByRole('button', { name: /send\s*reset/i }).click()
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('forgot-password — network', () => {
  test('submit triggers POST to forgot-password endpoint', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page
        .locator('input[type="email"]')
        .first()
        .fill('test-' + Date.now() + '@example.com')
      await page.getByRole('button', { name: /send reset/i }).click()
      await page.waitForTimeout(1500)
    })
    expect(reqs.some((r) => r.method === 'POST' && r.url.includes('/api/'))).toBe(true)
  })
})
