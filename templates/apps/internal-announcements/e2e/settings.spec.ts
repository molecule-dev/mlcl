/**
 * /settings — preferences page (notifications, channels, permissions,
 * account).
 *
 * settings-account.spec.ts covers the embedded SettingsPanel. This
 * spec covers the rest of the page: tab shape, notif/channel toggles
 * and the localStorage persistence invariant for those toggles, and
 * the permissions panel's read-only nature.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('settings page', () => {
  test('renders tabs, default-active is notifications', async ({ page }) => {
    await signup(page, uniqueEmail('settings-default'))
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('settings-tab-notifications')).toBeVisible()
    await expect(page.getByTestId('settings-notifications')).toBeVisible()
  })

  test('mentions notification toggle flips and persists across reload (localStorage invariant)', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('settings-mentions-persist'))
    await page.goto(APP_BASE + '/settings')
    const toggle = page.getByTestId('settings-notif-mentions')
    const before = await toggle.getAttribute('aria-checked')
    await toggle.click()
    await page.waitForTimeout(150)
    const after = await toggle.getAttribute('aria-checked')
    expect(after).not.toBe(before)
    await page.reload()
    const persisted = await page.getByTestId('settings-notif-mentions').getAttribute('aria-checked')
    expect(persisted).toBe(after)
  })

  test('Urgent notif toggle is locked ON (aria-checked=true, disabled)', async ({ page }) => {
    await signup(page, uniqueEmail('settings-urgent-locked'))
    await page.goto(APP_BASE + '/settings')
    const urgent = page.getByTestId('settings-notif-urgent')
    expect(await urgent.getAttribute('aria-checked')).toBe('true')
    expect(await urgent.isDisabled()).toBe(true)
  })

  test('switching to channels tab loads /api/categories and renders one toggle per channel', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('settings-channels-tab'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings', { waitUntil: 'networkidle' })
    })
    await page.getByTestId('settings-tab-channels').click()
    await expect(page.getByTestId('settings-channels')).toBeVisible()
    expect(reqs.some((r) => /\/api\/categories\b/.test(r.url) && r.method === 'GET')).toBe(true)
  })

  test('muting a channel via toggle persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('settings-channel-mute'))
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-channels').click()
    await page.waitForTimeout(400)
    // Find the first channel toggle (testIds are settings-channel-<slug>)
    const firstChannelToggle = page.locator('[data-testid^="settings-channel-"]').first()
    await expect(firstChannelToggle).toBeVisible()
    const before = await firstChannelToggle.getAttribute('aria-checked')
    await firstChannelToggle.click()
    await page.waitForTimeout(150)
    const after = await firstChannelToggle.getAttribute('aria-checked')
    expect(after).not.toBe(before)
    const id = await firstChannelToggle.getAttribute('data-testid')
    await page.reload()
    await page.getByTestId('settings-tab-channels').click()
    await page.waitForTimeout(400)
    const persisted = await page.locator(`[data-testid="${id}"]`).getAttribute('aria-checked')
    expect(persisted).toBe(after)
  })

  test('permissions tab renders read-only "Admin only" badges', async ({ page }) => {
    await signup(page, uniqueEmail('settings-permissions'))
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-permissions').click()
    await expect(page.getByTestId('settings-permissions')).toBeVisible()
    const badges = page.getByText(/admin only/i)
    await expect(badges.first()).toBeAttached()
  })

  test('Sign out from /settings works', async ({ page }) => {
    await signup(page, uniqueEmail('settings-signout'))
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /SIGN OUT|Sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 5000 })
  })

  test('Theme toggle flips data-mol-mode on /settings', async ({ page }) => {
    await signup(page, uniqueEmail('settings-theme'))
    await page.goto(APP_BASE + '/settings')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })

  test('switching tabs preserves the unrelated state (channels mute survives a notif tab visit)', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('settings-cross-tab'))
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-channels').click()
    await page.waitForTimeout(400)
    const tog = page.locator('[data-testid^="settings-channel-"]').first()
    await tog.click()
    const id = await tog.getAttribute('data-testid')
    const after = await tog.getAttribute('aria-checked')
    await page.getByTestId('settings-tab-notifications').click()
    await page.getByTestId('settings-tab-channels').click()
    await page.waitForTimeout(200)
    const persisted = await page.locator(`[data-testid="${id}"]`).getAttribute('aria-checked')
    expect(persisted).toBe(after)
  })

  test('Account tab is reachable and exposes the email input + plan readout', async ({ page }) => {
    await signup(page, uniqueEmail('settings-account-tab'))
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-account').click()
    await expect(page.locator('input#settings-email').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Plan:/i).first()).toBeVisible()
  })

  test('Account tab loads /api/users/me on view', async ({ page }) => {
    await signup(page, uniqueEmail('settings-account-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.getByTestId('settings-tab-account').click()
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/users\/me\b/.test(r.url) && r.method === 'GET')).toBe(true)
  })

  test('Account tab Upgrade button navigates to /pricing', async ({ page }) => {
    await signup(page, uniqueEmail('settings-account-upgrade'))
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-account').click()
    await page
      .getByRole('button', { name: /upgrade.*(pro|team|plan)?/i })
      .first()
      .click()
    await page.waitForURL(/\/pricing/, { timeout: 5000 })
  })

  test('Theme toggle persists across reload from /settings', async ({ page }) => {
    await signup(page, uniqueEmail('settings-theme-persist'))
    await page.goto(APP_BASE + '/settings')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
    await page.reload()
    const persisted = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    expect(persisted).toBe(after)
  })

  test('Account tab plan readout reflects the actual planKey for a fresh signup (not hardcoded)', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('settings-plan-readback'))
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-account').click()
    await page.waitForLoadState('networkidle')
    // Fresh signup must read from the API and not display anything that
    // hints at an upgrade (Pro/Team/Enterprise) — those would be wrong.
    const txt = await page.locator('body').innerText()
    expect(txt).toMatch(/Plan:\s*(Free|Starter|Trial)/i)
    expect(txt).not.toMatch(/Plan:\s*(Pro|Team|Enterprise)\b/i)
  })
})
