import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { signup } from './_helpers.js'

test('Settings page renders and exposes signature, tone, and integrations sections', async ({
  page,
}) => {
  await signup(page)
  await page.goto('/settings')
  await expect(page.locator('[data-mol-id="settings-page"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-mol-id="settings-signature-section"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="settings-behavior-section"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="settings-integrations-section"]')).toBeVisible()
})

test('Settings signature persists across reload (localStorage round-trip)', async ({ page }) => {
  await signup(page)
  await page.goto('/settings')
  const sig = 'Avery Chen — Signet test ' + Date.now()
  await page.locator('[data-mol-id="settings-signature"]').fill(sig)
  await page.locator('[data-mol-id="settings-save"]').click()
  // Confirmation toast
  await expect(page.locator('[data-mol-id="settings-status"]')).toBeVisible({ timeout: 5_000 })
  // Hard reload — the textarea must rehydrate from localStorage.
  await page.reload()
  await expect
    .poll(async () => await page.locator('[data-mol-id="settings-signature"]').inputValue(), {
      timeout: 10_000,
    })
    .toBe(sig)
  // Preview block also reflects the saved signature.
  await expect(page.locator('[data-mol-id="settings-signature-preview"]')).toContainText(sig)
})

test('Toggling an integration flips the Connect/Disconnect label and persists', async ({
  page,
}) => {
  await signup(page)
  await page.goto('/settings')
  const toggle = page.locator('[data-mol-id="settings-integration-toggle-gmail"]').first()
  await expect(toggle).toBeVisible({ timeout: 10_000 })
  const before = (await toggle.textContent())?.trim().toLowerCase() ?? ''
  await toggle.click()
  // Wait for the label to flip — connecting should produce "Disconnect"
  // and disconnecting should produce "Connect".
  await expect
    .poll(async () => (await toggle.textContent())?.trim().toLowerCase() ?? '', { timeout: 5_000 })
    .not.toBe(before)
  // Persistence: reload and verify the new label sticks.
  await page.reload()
  const persisted = page.locator('[data-mol-id="settings-integration-toggle-gmail"]').first()
  await expect(persisted).toBeVisible({ timeout: 10_000 })
  await expect
    .poll(async () => (await persisted.textContent())?.trim().toLowerCase() ?? '', {
      timeout: 5_000,
    })
    .not.toBe(before)
})

test('Settings behavior toggles surface labels for both options', async ({ page }) => {
  await signup(page)
  await page.goto('/settings')
  await expect(page.locator('[data-mol-id="settings-behavior-auto_summarize"]')).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.locator('[data-mol-id="settings-behavior-confirm_send"]')).toBeVisible()
})
