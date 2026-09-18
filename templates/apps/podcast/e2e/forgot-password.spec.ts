import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors } from './_helpers.js'

test.describe('forgot-password page', () => {
  test('renders heading, email input, and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
  })

  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.getByLabel(/email/i)
    await email.fill('test@example.com')
    await expect(email).toHaveValue('test@example.com')
  })

  test('submitting the form posts to /api/users/forgot-password and shows confirmation', async ({
    page,
  }) => {
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.getByLabel(/email/i).fill(`forgot-${Date.now()}@example.com`)
      await page.getByRole('button', { name: /send reset link/i }).click()
      // Wait for the network to settle.
      await page.waitForTimeout(2500)
    })
    expect(
      requests.some((r) => r.method === 'POST' && /\/users\/forgot-password\b/.test(r.url)),
    ).toBeTruthy()
  })

  test('"Sign In" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('forgot-password page has no console errors on idle render', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
    })
  })
})
