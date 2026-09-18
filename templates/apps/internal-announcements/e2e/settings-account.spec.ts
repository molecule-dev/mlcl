/**
 * /settings → Account tab.
 *
 * The /settings route ships notifications/channels/permissions tabs;
 * the email/password/2fa/devices/billing surface (SettingsPanel) was
 * previously only reachable from /pricing's user menu, leaving signed-
 * in users with no in-app way to change their email or password. A
 * fourth "Account" tab now embeds SettingsPanel directly. This spec
 * asserts that:
 *
 *   - the tab exists,
 *   - opening it surfaces the email input + Plan readout,
 *   - the Plan readout reflects the user's actual planKey (default
 *     "Free" for a fresh signup, NOT a hardcoded literal),
 *   - the Upgrade button navigates to /pricing.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('/settings Account tab', () => {
  test('Account tab is rendered alongside the other three tabs', async ({ page }) => {
    await signup(page, uniqueEmail('settings-tabs'))
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('settings-tab-notifications')).toBeVisible()
    await expect(page.getByTestId('settings-tab-channels')).toBeVisible()
    await expect(page.getByTestId('settings-tab-permissions')).toBeVisible()
    await expect(page.getByTestId('settings-tab-account')).toBeVisible()
  })

  test('opening Account exposes the email input + plan section', async ({ page }) => {
    await signup(page, uniqueEmail('settings-account-open'))
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-account').click()
    await expect(page.locator('input#settings-email')).toBeVisible()
    await expect(page.getByText(/Plan:/i).first()).toBeVisible()
  })

  test('Plan reads "Free" for a fresh signup (real planKey, not hardcoded)', async ({ page }) => {
    await signup(page, uniqueEmail('settings-account-plan'))
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-account').click()
    const planText = await page.getByText(/Plan:/i).first().innerText()
    // Default planKey for a fresh signup is "free" → display "Free".
    // Any other casing/text means we wired the readout but lost the
    // capitalize step (or the planKey is null/undefined).
    expect(planText).toMatch(/Plan:\s*Free/)
  })

  test('Upgrade button on the Account tab navigates to /pricing', async ({ page }) => {
    await signup(page, uniqueEmail('settings-account-upgrade'))
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-account').click()
    const upgrade = page.getByRole('button', { name: /upgrade/i }).first()
    await expect(upgrade).toBeVisible()
    await upgrade.click()
    await page.waitForURL(/\/pricing/, { timeout: 5000 })
  })
})
