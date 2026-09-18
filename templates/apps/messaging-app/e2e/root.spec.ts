import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, expectNoConsoleErrors, signup, uniqueEmail } from './_helpers.js'

test.describe('root /', () => {
  test('renders the marketing landing page when signed out', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /sign\s*in/i }).first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: /sign\s*up|create.*account/i }).first(),
    ).toBeVisible()
  })

  test('redirects to /inbox when already signed in', async ({ page }) => {
    await signup(page, uniqueEmail('root'))
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveURL(/\/inbox/, { timeout: 15000 })
  })

  test('landing renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/')
      await expect(page.getByRole('link', { name: /sign\s*in/i }).first()).toBeVisible()
    })
  })
})
