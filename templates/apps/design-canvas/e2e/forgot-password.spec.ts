/**
 * /forgot-password — Public form. POST /api/users/forgot-password to start the
 * reset flow. Submit always shows the confirmation panel (regardless of
 * whether email exists), so the test asserts on the panel + the network
 * call rather than UI errors.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('forgot-password page', () => {
  test('renders heading + form + bottom link', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('form[data-mol-id="forgot-form"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /Send reset link/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Back to sign in/ })).toBeVisible()
  })

  test('email input accepts a valid email', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.locator('input#forgot-email')
    await email.fill('mara@studio.test')
    await expect(email).toHaveValue('mara@studio.test')
  })

  test('submitting valid email shows the confirmation panel — POST /api/users/forgot-password hit', async ({
    page,
  }) => {
    const email = uniqueEmail('forgot')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input#forgot-email').fill(email)
      await page.locator('form[data-mol-id="forgot-form"] button[type="submit"]').click()
      await expect(page.locator('text=/Check your inbox/i')).toBeVisible({ timeout: 10000 })
    })
    const post = reqs.find(
      (r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST',
    )
    expect(post).toBeTruthy()
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to sign in/ }).click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })
})
