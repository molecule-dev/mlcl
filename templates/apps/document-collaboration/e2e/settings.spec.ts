/**
 * Settings — preference toggles persist + billing UI surfaces tiers.
 *
 * Outcome assertions:
 * - Toggling a notification preference writes through to
 *   users.oauthData.dc.notification_prefs and survives reload.
 * - Toggling an editor preference writes through.
 * - The settings page surfaces billing tiers from /api/billing/tiers.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('settings', () => {
  test('toggling a notification pref persists across reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('set-notif'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForSelector('[data-testid="settings-notif-comments"]', { timeout: 15000 })

    // Default for "comments" is true; click flips it to false.
    await page.getByTestId('settings-notif-comments').click()
    await expect(page.getByTestId('settings-saved-indicator')).toBeVisible({ timeout: 10000 })

    const fresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
    })
    const body = (await fresh.json()) as { notification_prefs: Record<string, boolean> }
    expect(body.notification_prefs.comments).toBe(false)

    await page.reload()
    await page.waitForSelector('[data-testid="settings-notif-comments"]')
    await expect(page.getByTestId('settings-notif-comments')).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  test('toggling an editor pref persists across reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('set-editor'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForSelector('[data-testid="settings-editor-spellcheck"]', { timeout: 15000 })

    await page.getByTestId('settings-editor-spellcheck').click()
    await expect(page.getByTestId('settings-saved-indicator')).toBeVisible({ timeout: 10000 })

    const fresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
    })
    const body = (await fresh.json()) as { editor_prefs: Record<string, boolean> }
    expect(body.editor_prefs.spellcheck).toBe(false)
  })

  test('billing tiers from /api/billing/tiers render on settings', async ({ page }) => {
    await signup(page, uniqueEmail('set-tiers'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForSelector('[data-testid="settings-tier-pro"]', { timeout: 15000 })
    await expect(page.getByTestId('settings-tier-pro')).toContainText(/pro/i)
    await expect(page.getByTestId('settings-tier-team')).toContainText(/team/i)
  })

  test('current plan reads as Free for a brand new account', async ({ page }) => {
    await signup(page, uniqueEmail('set-currplan'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForSelector('[data-testid="settings-current-plan"]')
    await expect(page.getByTestId('settings-current-plan')).toContainText(/free/i)
  })
})

test.describe('settings — network', () => {
  test('page load triggers profile + billing GETs', async ({ page }) => {
    await signup(page, uniqueEmail('set-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForSelector('[data-testid="settings-tier-pro"]', { timeout: 15000 })
    })
    expect(reqs.some((r) => r.url.includes('/api/profile/me'))).toBe(true)
    expect(reqs.some((r) => r.url.includes('/api/billing/tiers'))).toBe(true)
    expect(reqs.some((r) => r.url.includes('/api/billing/status'))).toBe(true)
  })
})
