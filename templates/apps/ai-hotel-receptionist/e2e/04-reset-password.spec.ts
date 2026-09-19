import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders both password fields without a token and keeps submit disabled', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('#password')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('#confirmPassword')).toBeVisible()
    // No ?token= in the URL → the server would reject; submit stays disabled.
    await expect(page.getByRole('button', { name: /Reset password/i })).toBeDisabled()
  })

  test('password mismatch is flagged inline', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=stub-token-for-form-check')
    await page.locator('#password').fill('TestPass123!')
    await page.locator('#confirmPassword').fill('DifferentPass99!')
    await page.getByRole('button', { name: /Reset password/i }).click()
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible({ timeout: 10000 })
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
