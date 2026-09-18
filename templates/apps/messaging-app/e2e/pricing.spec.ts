import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('pricing page', () => {
  test('renders three plan cards (Free, Pro, Team)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/pro/i).first()).toBeVisible()
    await expect(page.getByText(/team/i).first()).toBeVisible()
  })
})
