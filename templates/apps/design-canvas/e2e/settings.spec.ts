/**
 * /settings — Auth-only multi-section settings page. Loads /api/profile/me;
 * billing tab additionally loads /api/billing/status and /api/billing/tiers.
 * Profile / theme / notifications all PATCH /api/profile/me with prefs.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('settings page', () => {
  test('loads profile — GET /api/profile/me hit', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.locator('[data-mol-id="settings-content"]')).toBeVisible({ timeout: 10000 })
    })
    const get = reqs.find(
      (r) => /\/api\/profile\/me/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(get).toBeTruthy()
  })

  test('"Profile" rail button activates the profile form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-profile"]').click()
    await expect(page.locator('[data-mol-id="settings-profile-form"]')).toBeVisible()
  })

  test('"Appearance" rail button reveals theme cards', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-appearance"]').click()
    await expect(page.locator('[data-mol-id="settings-appearance"]')).toBeVisible()
  })

  test('"Notifications" rail button reveals the toggles list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-notifications"]').click()
    await expect(page.locator('[data-mol-id="settings-notifications"]')).toBeVisible()
  })

  test('"Billing" rail button loads billing status + tiers', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-section-billing"]').click()
      await expect(page.locator('[data-mol-id="settings-billing"]')).toBeVisible({ timeout: 10000 })
    })
    const status = reqs.find((r) => /\/api\/billing\/status/.test(r.url) && r.status < 400)
    const tiers = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.status < 400)
    expect(status, 'GET /api/billing/status').toBeTruthy()
    expect(tiers, 'GET /api/billing/tiers').toBeTruthy()
  })

  test('"Integrations" rail button reveals the integrations placeholder card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-integrations"]').click()
    await expect(page.locator('[data-mol-id="settings-integrations"]')).toBeVisible()
  })

  test('"Workspace" rail button activates the workspace placeholder', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-workspace"]').click()
    await expect(page.locator('[data-mol-id="settings-section-workspace"]')).toBeVisible()
  })

  test('"Security" rail button activates the security placeholder', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-security"]').click()
    await expect(page.locator('[data-mol-id="settings-section-security"]')).toBeVisible()
  })

  test('display-name input on profile form accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-profile-displayName"]').fill('Mara V.')
    await expect(page.locator('[data-mol-id="settings-profile-displayName"]')).toHaveValue(
      'Mara V.',
    )
  })

  test('Save profile PATCHes /api/profile/me and shows status', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const newName = `Settings Mara ${Date.now()}`
    await page.locator('[data-mol-id="settings-profile-displayName"]').fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-profile-save"]').click()
      await expect(page.locator('[data-mol-id="settings-profile-status"]')).toContainText(
        /Saved/i,
        { timeout: 10000 },
      )
      // The "Saved" status can render before the PATCH response is recorded, so
      // captureNetwork's window closed on the very request asserted below. Let the
      // network settle first (same fix as dashboard.spec.ts).
      await page.waitForLoadState('networkidle')
    })
    const patch = reqs.find(
      (r) => /\/api\/profile\/me/.test(r.url) && r.method === 'PATCH' && r.status < 400,
    )
    expect(patch).toBeTruthy()
    const fresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    expect((await fresh.json()).prefs?.displayName).toBe(newName)
  })

  test('Theme: "Dark" PATCHes prefs.theme=dark and flips <html class="dark">', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-appearance"]').click()
    await page.locator('[data-mol-id="settings-theme-dark"]').click()
    await page.waitForTimeout(800)
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(
      true,
    )
    const fresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    expect((await fresh.json()).prefs?.theme).toBe('dark')
  })

  test('Theme: "Light" PATCHes prefs.theme=light', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-appearance"]').click()
    await page.locator('[data-mol-id="settings-theme-light"]').click()
    await page.waitForTimeout(800)
    const fresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    expect((await fresh.json()).prefs?.theme).toBe('light')
  })

  test('Theme: "System" PATCHes prefs.theme=system', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-appearance"]').click()
    await page.locator('[data-mol-id="settings-theme-system"]').click()
    await page.waitForTimeout(800)
    const fresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    expect((await fresh.json()).prefs?.theme).toBe('system')
  })

  test('Notification toggle (mentions) PATCHes prefs.notifyMentions', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-notifications"]').click()
    await page
      .locator('[data-mol-id="settings-notif-notifyMentions"] input[type="checkbox"]')
      .uncheck()
    await page.waitForTimeout(800)
    const fresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    expect((await fresh.json()).prefs?.notifyMentions).toBe(false)
  })

  test('Notification toggle (digest) PATCHes prefs.notifyDigest', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-section-notifications"]').click()
    await page.locator('[data-mol-id="settings-notif-notifyDigest"] input[type="checkbox"]').check()
    await page.waitForTimeout(800)
    const fresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    expect((await fresh.json()).prefs?.notifyDigest).toBe(true)
  })
})
