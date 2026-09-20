import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('reset password page renders the new-password form', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password')
  await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
})
