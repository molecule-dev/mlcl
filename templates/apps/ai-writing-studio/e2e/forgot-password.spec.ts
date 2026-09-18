/**
 * /forgot-password — public password-reset request form.
 *
 * Real outcome: the POST to /api/users/forgot-password succeeds and the
 * UI swaps to the success status banner. The molecule emails-mailgun bond
 * queues the actual reset email — we don't fake it.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
  })

  test('renders the Reset your password heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Reset your password/i })).toBeVisible()
  })

  test('email input accepts an address', async ({ page }) => {
    const email = page.getByLabel(/Email address/i)
    await email.fill('reset@example.com')
    await expect(email).toHaveValue('reset@example.com')
  })

  test('Send reset link submits POST /api/users/forgot-password and shows the success banner', async ({
    page,
  }) => {
    const email = uniqueEmail('forgot')
    await page.getByLabel(/Email address/i).fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send reset link/i }).click()
      await expect(page.getByRole('status')).toBeVisible({ timeout: 10_000 })
    })
    const forgotCall = reqs.find(
      (r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST',
    )
    expect(forgotCall, 'forgot-password POST must fire').toBeTruthy()
    expect(forgotCall?.status).toBeGreaterThanOrEqual(200)
    expect(forgotCall?.status).toBeLessThan(300)
    await expect(page.getByRole('status')).toContainText(email)
  })

  test('Back-to-sign-in link routes to /login', async ({ page }) => {
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
