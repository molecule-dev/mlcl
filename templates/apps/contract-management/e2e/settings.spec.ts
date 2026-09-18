/**
 * /settings — profile read/edit, signature, notification preferences.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('settings', () => {
  test('renders heading and profile fields', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible()
    await expect(page.locator('#settings-name')).toBeVisible()
    await expect(page.locator('#settings-email')).toBeVisible()
  })

  test('updates profile name + persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const newName = `Renamed ${Date.now()}`
    await page.locator('#settings-name').fill(newName)
    await page
      .getByRole('button', { name: /Save profile|Save changes|Save/i })
      .first()
      .click()
    await page.waitForTimeout(800)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#settings-name')).toHaveValue(newName)
  })

  test('updates signature and persists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /^Signatures$/i }).click()
    await expect(page.locator('#settings-signature-name')).toBeVisible()
    const sig = `Sig ${Date.now()}`
    await page.locator('#settings-signature-name').fill(sig)
    await page
      .getByRole('button', { name: /Save signature|Save/i })
      .first()
      .click()
    await page.waitForTimeout(800)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /^Signatures$/i }).click()
    await expect(page.locator('#settings-signature-name')).toHaveValue(sig)
  })
})
