import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers'

/**
 * /settings — profile + notifications round-trip through
 * PATCH /api/profiles/me. Past failure: settings forms that only mutate
 * local state (so the change vanishes on reload). We assert (a) the
 * banner appears, (b) GET /api/profiles/me returns the new value, AND
 * (c) the field is still set after a full page reload.
 */

test('Settings profile section round-trips name + bio + website through reload', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.locator('[data-mol-id="settings-tab-profile"]').click()

  await page.locator('#display-name').fill('Updated Name')
  await page.locator('#bio').fill('Maker of small useful things.')
  await page.locator('#website').fill('https://example.dev')

  await page.locator('[data-mol-id="settings-save-profile"]').click()
  await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 8_000 })

  // Backend invariant: GET /api/profiles/me reflects all three values
  const me = await page.evaluate(async () => {
    const r = await fetch('/api/profiles/me')
    return r.json()
  })
  expect(me.name).toBe('Updated Name')
  expect(me.bio).toBe('Maker of small useful things.')
  expect(me.preferences.website).toBe('https://example.dev')

  // After a full reload, the form is repopulated from the server
  await page.reload()
  await expect(page.locator('#display-name')).toHaveValue('Updated Name', { timeout: 10_000 })
  await expect(page.locator('#bio')).toHaveValue('Maker of small useful things.')
  await expect(page.locator('#website')).toHaveValue('https://example.dev')
})

test('Settings notification toggles persist across reload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.locator('[data-mol-id="settings-tab-notifications"]').click()

  // Defaults are: newPledge=true, milestone=true, comment=true, weeklyDigest=false
  // Toggle weeklyDigest ON via its data-mol-id-tagged button
  const weeklyToggle = page.locator('[data-mol-id="toggle-weeklyDigest"]')
  await expect(weeklyToggle).toHaveAttribute('aria-pressed', 'false')
  await weeklyToggle.click()
  await expect(weeklyToggle).toHaveAttribute('aria-pressed', 'true')

  await page.locator('[data-mol-id="settings-save-notifications"]').click()
  await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 8_000 })

  // Backend: GET /api/profiles/me reflects the new pref blob
  const me = await page.evaluate(async () => {
    const r = await fetch('/api/profiles/me')
    return r.json()
  })
  const np = me.preferences?.notifications as Record<string, boolean> | undefined
  expect(np).toBeTruthy()
  expect(np?.weeklyDigest).toBe(true)

  // After reload, the section still reflects the pref
  await page.reload()
  await page.locator('[data-mol-id="settings-tab-notifications"]').click()
  await expect(page.locator('[data-mol-id="toggle-weeklyDigest"]')).toHaveAttribute(
    'aria-pressed',
    'true',
    { timeout: 10_000 },
  )
})

test('Settings sidebar navigates between tabs', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.locator('[data-mol-id="settings-tab-payouts"]').click()
  await expect(page.getByText(/stripe connect/i).first()).toBeVisible({ timeout: 5_000 })
  await page.locator('[data-mol-id="settings-tab-danger"]').click()
  await expect(page.getByText(/delete account/i)).toBeVisible()
})
