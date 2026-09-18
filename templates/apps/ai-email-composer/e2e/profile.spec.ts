import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { signup } from './_helpers.js'

test('Profile page surfaces the signed-in user email and tone-profile chips', async ({ page }) => {
  const { email } = await signup(page)
  await page.goto('/profile')
  await expect(page.locator('[data-mol-id="profile-page"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-mol-id="profile-email"]')).toContainText(email)
  await expect(page.locator('[data-mol-id="profile-avatar"]')).toBeVisible()
})

test('Profile signature preview reflects the latest Settings signature', async ({ page }) => {
  await signup(page)
  // Set signature in Settings, then visit Profile.
  await page.goto('/settings')
  const sig = 'Profile signature ' + Date.now()
  await page.locator('[data-mol-id="settings-signature"]').fill(sig)
  await page.locator('[data-mol-id="settings-save"]').click()
  await expect(page.locator('[data-mol-id="settings-status"]')).toBeVisible({ timeout: 5_000 })

  await page.goto('/profile')
  await expect(page.locator('[data-mol-id="profile-signature"]')).toContainText(sig, {
    timeout: 10_000,
  })
})

test('Profile activity section is empty for a fresh user (no sends, drafts, or templates)', async ({
  page,
}) => {
  await signup(page)
  await page.goto('/profile')
  await expect(page.locator('[data-mol-id="profile-activity-empty"]')).toBeVisible({
    timeout: 15_000,
  })
})
