import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

/**
 * Per-page spec for /profile. Three side tabs (Identity, Preferences,
 * Notifications) backed by users.oauthData.profile. Save fires
 * PATCH /api/users/:id and persists across reload.
 */

test.describe('profile page', () => {
  test('profile heading is visible', async ({ page }) => {
    await signup(page, uniqueEmail('prof-h'), 'TestPass123!')
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { name: /^profile$/i }).first()).toBeVisible()
  })

  test('identity tab is rendered as default', async ({ page }) => {
    await signup(page, uniqueEmail('prof-id'), 'TestPass123!')
    await page.goto(APP_BASE + '/profile')
    const tab = page.locator('[data-mol-id="profile-section-identity"]').first()
    await expect(tab).toBeVisible()
    await expect(tab).toHaveAttribute('aria-current', 'page')
  })

  test('preferences tab activates on click', async ({ page }) => {
    await signup(page, uniqueEmail('prof-pref'), 'TestPass123!')
    await page.goto(APP_BASE + '/profile')
    const tab = page.locator('[data-mol-id="profile-section-preferences"]').first()
    await tab.click()
    await expect(tab).toHaveAttribute('aria-current', 'page')
  })

  test('notifications tab activates on click', async ({ page }) => {
    await signup(page, uniqueEmail('prof-notif'), 'TestPass123!')
    await page.goto(APP_BASE + '/profile')
    const tab = page.locator('[data-mol-id="profile-section-notifications"]').first()
    await tab.click()
    await expect(tab).toHaveAttribute('aria-current', 'page')
  })

  test('display name input edits', async ({ page }) => {
    await signup(page, uniqueEmail('prof-name'), 'TestPass123!')
    await page.goto(APP_BASE + '/profile')
    const input = page.locator('[data-mol-id="profile-display-name"]').first()
    await input.fill('Avery Mae')
    await expect(input).toHaveValue('Avery Mae')
  })

  test('bio textarea edits', async ({ page }) => {
    await signup(page, uniqueEmail('prof-bio'), 'TestPass123!')
    await page.goto(APP_BASE + '/profile')
    const ta = page.locator('[data-mol-id="profile-bio"]').first()
    await ta.fill('Bio text for the spec.')
    await expect(ta).toHaveValue('Bio text for the spec.')
  })

  test('save persists across reload (read-after-write)', async ({ page }) => {
    await signup(page, uniqueEmail('prof-save'), 'TestPass123!')
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-display-name"]').first().fill('Avery Mae')
    await page.locator('[data-mol-id="profile-bio"]').first().fill('Spec-managed bio')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="profile-save"]').first().click()
      await expect(page.locator('[data-mol-id="profile-saved"]')).toBeVisible({ timeout: 5_000 })
    })
    const patchCall = reqs.find((r) => /\/api\/users\//.test(r.url) && r.method === 'PATCH')
    expect(patchCall, 'PATCH /api/users/:id should fire on save').toBeTruthy()
    expect([200, 201]).toContain(patchCall!.status)

    await page.reload()
    await expect(page.locator('[data-mol-id="profile-display-name"]')).toHaveValue('Avery Mae', {
      timeout: 5_000,
    })
    await expect(page.locator('[data-mol-id="profile-bio"]')).toHaveValue('Spec-managed bio')
  })

  test('cancel reverts unsaved edits', async ({ page }) => {
    await signup(page, uniqueEmail('prof-cancel'), 'TestPass123!')
    await page.goto(APP_BASE + '/profile')
    const input = page.locator('[data-mol-id="profile-display-name"]').first()
    await input.fill('Will be reverted')
    await page.locator('[data-mol-id="profile-cancel"]').first().click()
    await expect(input).not.toHaveValue('Will be reverted')
  })

  test('sidebar nav-settings chrome is rendered (profile lives under settings cluster)', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('prof-nav'), 'TestPass123!')
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="nav-settings"]').first()).toBeVisible()
  })
})
