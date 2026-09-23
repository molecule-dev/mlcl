import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

/**
 * Per-page spec for /settings. Three side tabs (Transcription, Sharing,
 * Retention) backed by the server-side settings channel
 * (users.oauthData.settings, read/merged by GET/PATCH /api/settings/me — the
 * platform user resource never returns oauthData on reads). Save fires
 * PATCH /api/settings/me and persists across reload.
 */

test.describe('settings page', () => {
  test('settings heading is visible', async ({ page }) => {
    await signup(page, uniqueEmail('set-h'), 'TestPass123!')
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^settings$/i }).first()).toBeVisible()
  })

  test('transcription tab is rendered as default', async ({ page }) => {
    await signup(page, uniqueEmail('set-trans'), 'TestPass123!')
    await page.goto(APP_BASE + '/settings')
    const tab = page.locator('[data-mol-id="settings-section-transcription"]').first()
    await expect(tab).toBeVisible()
    await expect(tab).toHaveAttribute('aria-current', 'page')
  })

  test('sharing tab activates on click', async ({ page }) => {
    await signup(page, uniqueEmail('set-share'), 'TestPass123!')
    await page.goto(APP_BASE + '/settings')
    const tab = page.locator('[data-mol-id="settings-section-sharing"]').first()
    await tab.click()
    await expect(tab).toHaveAttribute('aria-current', 'page')
  })

  test('retention tab activates on click', async ({ page }) => {
    await signup(page, uniqueEmail('set-ret'), 'TestPass123!')
    await page.goto(APP_BASE + '/settings')
    const tab = page.locator('[data-mol-id="settings-section-retention"]').first()
    await tab.click()
    await expect(tab).toHaveAttribute('aria-current', 'page')
  })

  test('transcription language combobox switches value', async ({ page }) => {
    await signup(page, uniqueEmail('set-lang'), 'TestPass123!')
    await page.goto(APP_BASE + '/settings')
    const select = page.locator('[data-mol-id="settings-transcription-language"]').first()
    await select.selectOption('Spanish')
    await expect(select).toHaveValue('Spanish')
  })

  test('transcription speakers combobox switches value', async ({ page }) => {
    await signup(page, uniqueEmail('set-speak'), 'TestPass123!')
    await page.goto(APP_BASE + '/settings')
    const select = page.locator('[data-mol-id="settings-transcription-speakers"]').first()
    await select.selectOption('Single speaker')
    await expect(select).toHaveValue('Single speaker')
  })

  test('save persists across reload (read-after-write)', async ({ page }) => {
    await signup(page, uniqueEmail('set-save'), 'TestPass123!')
    await page.goto(APP_BASE + '/settings')
    await page
      .locator('[data-mol-id="settings-transcription-language"]')
      .first()
      .selectOption('French')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-save"]').first().click()
      await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 5_000 })
    })
    const patchCall = reqs.find((r) => /\/api\/settings\/me/.test(r.url) && r.method === 'PATCH')
    expect(patchCall, 'PATCH /api/settings/me should fire on save').toBeTruthy()
    expect([200, 201]).toContain(patchCall!.status)

    await page.reload()
    await expect(page.locator('[data-mol-id="settings-transcription-language"]')).toHaveValue(
      'French',
      { timeout: 5_000 },
    )
  })

  test('cancel reverts unsaved edits', async ({ page }) => {
    await signup(page, uniqueEmail('set-cancel'), 'TestPass123!')
    await page.goto(APP_BASE + '/settings')
    const select = page.locator('[data-mol-id="settings-transcription-language"]').first()
    await select.selectOption('Spanish')
    await page.locator('[data-mol-id="settings-cancel"]').first().click()
    await expect(select).toHaveValue('English (US)')
  })

  test('sidebar nav-settings chrome is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('set-nav'), 'TestPass123!')
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-mol-id="nav-settings"]').first()).toBeVisible()
  })
})
