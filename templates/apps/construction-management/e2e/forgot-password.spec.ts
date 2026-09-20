import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, uniqueEmail } from './_helpers.js'

test('forgot password page renders the reset request form', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.locator('input#email')).toBeVisible()
  await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
})

test('requesting a reset link acknowledges the request', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('input#email').fill(uniqueEmail())
  await page.getByRole('button', { name: /send reset link/i }).click()
  // The shared auth flow acknowledges the request (no error banner).
  await expect(page.locator('[role="alert"]')).toHaveCount(0)
})
