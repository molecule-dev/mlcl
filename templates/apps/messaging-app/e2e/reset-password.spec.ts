import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, expectNoConsoleErrors } from './_helpers.js'

test.describe('reset-password page', () => {
  test('renders email + token + new-password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/token|code/i)).toBeVisible()
    await expect(page.getByLabel(/new password|^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /reset|change|submit/i })).toBeVisible()
  })

  test('back-to-sign-in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /back.*sign|sign\s*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/reset-password')
      await expect(page.getByRole('button', { name: /reset|submit/i })).toBeVisible()
    })
  })
})
