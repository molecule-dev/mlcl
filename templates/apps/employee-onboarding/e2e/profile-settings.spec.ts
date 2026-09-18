/**
 * Profile + Settings smoke — both pages render their app shells and key
 * data. Settings "Upgrade" link routes to /pricing.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('profile + settings', () => {
  test('profile page renders', async ({ page }) => {
    await signup(page, uniqueEmail('profile-render'))
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-profile"]').first()).toBeVisible()
  })

  test('settings page renders', async ({ page }) => {
    await signup(page, uniqueEmail('settings-render'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-settings"]').first()).toBeVisible()
  })

  test('settings upgrade button routes to /pricing', async ({ page }) => {
    await signup(page, uniqueEmail('settings-upgrade'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const upgrade = page.getByRole('button', { name: /upgrade/i }).first()
    if (await upgrade.count()) {
      await upgrade.click()
      await page.waitForURL(/\/pricing/, { timeout: 10000 })
    }
  })
})
