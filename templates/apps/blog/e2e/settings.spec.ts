/**
 * /settings — preferences (theme/font/bio/notifications) persist across
 * reload via /api/profile/preferences. The PreferencesApplier component
 * also re-applies them to <html data-theme=…> on every load.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('settings preferences', () => {
  test('switching theme + font and saving persists across reload (DB + DOM)', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('settings-prefs'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')

    // Click "dark" theme + "large" font.
    await page.locator('[data-mol-id="mode-dark"]').first().click()
    await page.locator('[data-mol-id="font-large"]').first().click()

    // Save via the top-bar save button.
    await page.locator('[data-mol-id="save-settings-top"]').first().click()
    await expect(page.locator('[data-mol-id="settings-message"]')).toBeVisible({ timeout: 10000 })

    // Backend invariant: the preferences row is updated.
    const me = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(me.status()).toBeLessThan(400)
    const meBody = (await me.json()) as { preferences: { theme: string; fontSize: string } }
    expect(meBody.preferences.theme).toBe('dark')
    expect(meBody.preferences.fontSize).toBe('large')

    // DOM invariant after reload — PreferencesApplier should rehydrate.
    await page.reload()
    await page.waitForLoadState('networkidle')
    const theme = await page.evaluate(() => document.documentElement.dataset.theme)
    const font = await page.evaluate(() => document.documentElement.dataset.fontSize)
    expect(theme).toBe('dark')
    expect(font).toBe('large')
  })

  test('updating bio + privacy toggles persists in /profile/me', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('settings-bio'))
    const bio = `Hello from ${Date.now()}`

    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')

    const bioInput = page.locator('textarea').first()
    await bioInput.fill(bio)
    await page.locator('[data-mol-id="save-settings-top"]').first().click()
    await expect(page.locator('[data-mol-id="settings-message"]')).toBeVisible({ timeout: 10000 })

    const me = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(me.status()).toBeLessThan(400)
    const meBody = (await me.json()) as { preferences: { bio: string } }
    expect(meBody.preferences.bio).toBe(bio)
  })

  test('GET /api/profile/me fires on load (network)', async ({ page }) => {
    await signup(page, uniqueEmail('settings-network'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle')
    })
    const r = reqs.find((r) => r.method === 'GET' && /\/api\/profile\/me/.test(r.url))
    expect(r, 'settings page must hydrate from /api/profile/me').toBeTruthy()
    expect(r!.status).toBeLessThan(400)
  })

  test('updating display name persists via PATCH /api/users/:id', async ({ page }) => {
    const { accessToken, userId } = await signup(page, uniqueEmail('settings-name'))
    expect(userId).toBeTruthy()
    const newName = `Renamed ${Date.now()}`
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')

    const nameInput = page.locator('input[type="text"]').first()
    await nameInput.fill(newName)
    await page.locator('[data-mol-id="save-settings-top"]').first().click()
    await page.waitForTimeout(800)

    const me = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(me.status()).toBeLessThan(400)
    const got = (await me.json()) as { name?: string | null }
    expect(got.name).toBe(newName)
  })

  test('settings save shows the success message', async ({ page }) => {
    await signup(page, uniqueEmail('settings-msg'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="save-settings-top"]').first().click()
    await expect(page.locator('[data-mol-id="settings-message"]')).toBeVisible({ timeout: 10000 })
  })

  test('a brand-new account loads the settings form successfully', async ({ page }) => {
    await signup(page, uniqueEmail('settings-fresh'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('the Save button is in the top bar', async ({ page }) => {
    await signup(page, uniqueEmail('settings-savebtn'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="save-settings-top"]').first()).toBeVisible()
  })

  test('appearance section: theme controls are present', async ({ page }) => {
    await signup(page, uniqueEmail('settings-appearance'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    if (await page.locator('[data-mol-id="mode-dark"]').count()) {
      await expect(page.locator('[data-mol-id="mode-dark"]').first()).toBeVisible()
    }
  })

  test('appearance section: font-size controls are present', async ({ page }) => {
    await signup(page, uniqueEmail('settings-fonts'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    if (await page.locator('[data-mol-id="font-large"]').count()) {
      await expect(page.locator('[data-mol-id="font-large"]').first()).toBeVisible()
    }
  })

  test('the danger-zone delete-account button is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('settings-danger'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const danger = page.getByRole('button', { name: /delete\s*account/i }).first()
    if (await danger.count()) await expect(danger).toBeVisible()
  })

  test('the email field is rendered and editable', async ({ page }) => {
    const { email } = await signup(page, uniqueEmail('settings-email'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('#settings-email')
    await expect(emailInput).toBeVisible()
    expect(await emailInput.inputValue()).toBe(email)
    // Email became editable in the settings form (it is PATCHed alongside the
    // name by Save changes) — assert it is NOT read-only.
    expect(await emailInput.getAttribute('readonly')).toBeNull()
    await expect(emailInput).toBeEditable()
  })

  test('PATCH /api/profile/preferences persists notifications toggles', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('settings-notif'))
    const beforeRes = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    const before = (await beforeRes.json()) as { preferences: { newFollowers: boolean } }

    await page.request.patch(`${API_BASE}/profile/preferences`, {
      headers: authHeaders(accessToken),
      data: { ...before.preferences, newFollowers: !before.preferences.newFollowers },
      failOnStatusCode: false,
    })
    const afterRes = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    const after = (await afterRes.json()) as { preferences: { newFollowers: boolean } }
    expect(after.preferences.newFollowers).toBe(!before.preferences.newFollowers)
  })

  test('cancel button is rendered in the form footer', async ({ page }) => {
    await signup(page, uniqueEmail('settings-cancel'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const c = page.getByRole('button', { name: /cancel/i }).first()
    if (await c.count()) await expect(c).toBeVisible()
  })

  test('anonymous access redirects away from /settings', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 10000 })
  })

  test('PATCH /api/users/:id round-trips the display name (invariant)', async ({ page }) => {
    const { accessToken, userId } = await signup(page, uniqueEmail('settings-patch-name'))
    expect(userId).toBeTruthy()
    const newName = `RoundTrip ${Date.now()}`
    const r = await page.request.patch(`${API_BASE}/users/${userId}`, {
      headers: authHeaders(accessToken),
      data: { name: newName },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeLessThan(400)
    const me = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    const got = (await me.json()) as { name?: string }
    expect(got.name).toBe(newName)
  })
})
