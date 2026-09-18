import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('Billing page shows heading + plan section', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings/billing')
  await expect(page.getByRole('heading', { name: /^billing$/i })).toBeVisible()
  // Free user should see plan name
  await expect(page.getByText(/plan|free/i).first()).toBeVisible({ timeout: 10000 })
})
