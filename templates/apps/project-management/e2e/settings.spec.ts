/**
 * /settings — verifies the Profile, Notifications, Appearance, and Account
 * sections are wired to the real backend (read-after-write through reload).
 *
 * Tests:
 * - Profile.save persists displayName + bio in `oauthData.pm` and survives reload
 * - Notifications.save persists toggles + survives reload
 * - Theme toggle changes <html data-theme> and survives reload
 * - Change-password actually rotates the hash AND invalidates sessions
 * - Delete-account requires DELETE confirmation and removes the user row
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  captureNetwork,
  login,
  signOut,
  signup,
  uniqueEmail,
} from './_helpers.js'

const apiBase = () => `http://localhost:${process.env.API_PORT || '4020'}/api`

test.describe('settings page', () => {
  test('Profile save: displayName + bio round-trip via /api/profile/me and survive reload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('settings-profile'))
    await page.goto(APP_BASE + '/settings')
    // Wait for the section's profile fetch to land before filling the inputs;
    // otherwise the useEffect-driven hydration can overwrite our typed text.
    await page.waitForLoadState('networkidle')
    const newName = 'Renee Architect'
    const newBio = 'I orchestrate large-scale builds.'
    await page.locator('#profile-display-name').fill(newName)
    await page.locator('#profile-bio').fill(newBio)
    const reqs = await captureNetwork(page, async () => {
      await page
        .locator('button')
        .filter({ hasText: /Save Changes/i })
        .click()
      await expect(page.getByTestId('profile-saved')).toBeVisible({ timeout: 5000 })
    })
    expect(
      reqs.some((r) => r.method === 'PATCH' && r.url.includes('/api/profile/me')),
      'PATCH /api/profile/me fired on save',
    ).toBeTruthy()

    // Read-after-write: GET /api/profile/me returns the new fields.
    const me = await page.request.get(`${apiBase()}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    expect(me.status()).toBe(200)
    const body = (await me.json()) as {
      name: string
      preferences: { displayName?: string; bio?: string }
    }
    expect(body.name).toBe(newName)
    expect(body.preferences.displayName).toBe(newName)
    expect(body.preferences.bio).toBe(newBio)

    // Reload-persist: settings page rehydrates from the server.
    await page.reload()
    await expect(page.locator('#profile-display-name')).toHaveValue(newName)
    await expect(page.locator('#profile-bio')).toHaveValue(newBio)
  })

  test('Notifications save: toggling email + push persists in oauthData.pm and across reload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('settings-notifs'))
    await page.goto(APP_BASE + '/settings')
    // Wait for the profile fetch to settle so the section's useEffect-driven
    // hydration doesn't overwrite our toggle clicks (default emailNotifications
    // is true on first render but the server fetch can race with our click).
    await page.waitForLoadState('networkidle')
    const emailToggle = page.locator('input[type="checkbox"]').nth(0)
    await expect(emailToggle).toBeChecked()
    await emailToggle.click({ force: true })
    await expect(emailToggle).not.toBeChecked()

    const pushToggle = page.locator('input[type="checkbox"]').nth(1)
    await expect(pushToggle).not.toBeChecked()
    await pushToggle.click({ force: true })
    await expect(pushToggle).toBeChecked()

    await page
      .locator('button')
      .filter({ hasText: /Save Preferences/i })
      .click()
    await expect(page.getByTestId('notifications-saved')).toBeVisible({ timeout: 5000 })

    const me = await page.request.get(`${apiBase()}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await me.json()) as {
      preferences: { emailNotifications: boolean; pushNotifications: boolean }
    }
    expect(body.preferences.emailNotifications).toBe(false)
    expect(body.preferences.pushNotifications).toBe(true)

    await page.reload()
    await expect(page.locator('input[type="checkbox"]').nth(0)).not.toBeChecked()
    await expect(page.locator('input[type="checkbox"]').nth(1)).toBeChecked()
  })

  test('Theme toggle to Dark Mode changes <html> dataset and survives reload', async ({ page }) => {
    await signup(page, uniqueEmail('settings-theme'))
    await page.goto(APP_BASE + '/settings')
    // The CSS-variables theme bond writes `data-mol-mode` (and data-mol-theme).
    const before = await page.evaluate(() => document.documentElement.dataset.molMode)
    await page
      .locator('button')
      .filter({ hasText: /Dark Mode/i })
      .click()
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => document.documentElement.dataset.molMode)
    expect(after, 'mol-mode must change after Dark Mode click').not.toBe(before)
    expect(after).toBe('dark')

    await page.reload()
    const persisted = await page.evaluate(() => document.documentElement.dataset.molMode)
    expect(persisted, 'theme persists across reload').toBe('dark')
  })

  test('Change password: PATCH /users/:id/password rotates hash → old password no longer logs in', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('settings-pw')
    const oldPw = 'TestPass!1234'
    const newPw = 'NewPass!4567'
    await signup(page, email, oldPw)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('account-change-password-toggle').click()
    await page.getByTestId('account-current-password').fill(oldPw)
    await page.getByTestId('account-new-password').fill(newPw)
    await page.getByTestId('account-change-password-submit').click()
    await expect(page.getByTestId('account-password-saved')).toBeVisible({ timeout: 8000 })

    // Old password no longer works.
    await context.clearCookies()
    await signOut(page)
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(oldPw)
    // The rejected old-password login is SUPPOSED to 403 — allow the expected
    // console error before arming the submit.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.locator('form button[type="submit"]').first().click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8000 })
    await expect(page).toHaveURL(/\/login/)

    // New password DOES work.
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(newPw)
    await page.locator('form button[type="submit"]').first().click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Delete account: typing DELETE removes the user row and forbids re-login', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('settings-del')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('account-delete-toggle').click()
    await page.getByTestId('account-delete-confirm').fill('DELETE')
    // The delete flow calls logout() AFTER the user row is gone, so the
    // logout endpoint 401s — the app deliberately ignores it. Allow that
    // expected console error before arming the delete click.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
    await page.getByTestId('account-delete-confirm-button').click()
    await page.waitForURL(/\/signup/, { timeout: 10000 })

    // Re-login fails (user is gone).
    await context.clearCookies()
    await signOut(page)
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    // A deleted user's login is SUPPOSED to 403 — allow the expected
    // console error before arming the submit.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.locator('form button[type="submit"]').first().click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
