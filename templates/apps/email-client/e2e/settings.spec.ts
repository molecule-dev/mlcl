/**
 * /settings page lets the user view and update profile, toggle preferences
 * (persisted to localStorage so they survive reload), edit a signature,
 * and sign out. We assert read-after-write on the profile name (PATCH the
 * user, then re-GET) and reload-persistence on the preference toggles.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  getAccessToken,
  signup,
} from './_helpers.js'

test('Settings account shows the signed-in user email and name', async ({ page }) => {
  const { email } = await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-mol-id="settings-email"]')).toContainText(email)
  await expect(page.locator('[data-mol-id="settings-name"]')).toBeVisible()
})

test('Settings — edit profile name persists via PATCH /api/users/:id', async ({ page }) => {
  const { accessToken, userId } = await signup(page)

  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')

  await page.locator('[data-mol-id="settings-edit-profile"]').click()
  const newName = 'Renamed User ' + Date.now()
  await page.locator('[data-mol-id="settings-name-input"]').fill(newName)
  await page.locator('[data-mol-id="settings-save-profile"]').click()
  // Inline feedback should appear.
  await expect(page.locator('[data-mol-id="settings-profile-feedback"]')).toBeVisible({
    timeout: 5_000,
  })

  // Read-after-write via API.
  const res = await page.request.get(`${API_BASE}/users/${userId}`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as {
    props?: { name?: string }
    data?: { name?: string }
    name?: string
  }
  const persistedName = body.props?.name ?? body.data?.name ?? body.name
  expect(persistedName).toBe(newName)
})

test('Settings — preference toggles persist across reload via localStorage', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.locator('[data-mol-id="settings-section-notifications"]').click()
  // Default is desktop_notifications=true. Toggle off, reload, expect off.
  const toggle = page.locator('[data-mol-id="settings-toggle-desktop_notifications"]')
  const before = await toggle.getAttribute('aria-checked')
  await toggle.click()
  const after = await toggle.getAttribute('aria-checked')
  expect(after).not.toBe(before)
  await page.reload()
  await page.locator('[data-mol-id="settings-section-notifications"]').click()
  const persisted = await page
    .locator('[data-mol-id="settings-toggle-desktop_notifications"]')
    .getAttribute('aria-checked')
  expect(persisted).toBe(after)
})

test('Settings — sign out logs the user out and redirects to /login', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.locator('[data-mol-id="settings-section-security"]').click()
  await page.locator('[data-mol-id="settings-sign-out"]').click()
  await page.waitForURL(/\/login/, { timeout: 10_000 })
  // Token is gone.
  const tok = await getAccessToken(page)
  expect(tok).toBeFalsy()
})

test('Settings — signature save round-trips via localStorage', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.locator('[data-mol-id="settings-section-signatures"]').click()
  const sig = '— signed by E2E test ' + Date.now()
  await page.locator('[data-mol-id="settings-signature-input"]').fill(sig)
  await page.locator('[data-mol-id="settings-save-signature"]').click()
  await expect(page.locator('[data-mol-id="settings-signature-feedback"]')).toBeVisible({
    timeout: 3_000,
  })
  await page.reload()
  await page.locator('[data-mol-id="settings-section-signatures"]').click()
  await expect(page.locator('[data-mol-id="settings-signature-input"]')).toHaveValue(sig)
})

test('Settings — section tabs switch the visible panel', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('[data-mol-id="settings-account"]')).toBeVisible()
  await page.locator('[data-mol-id="settings-section-notifications"]').click()
  await expect(page.locator('[data-mol-id="settings-prefs"]')).toBeVisible()
  await page.locator('[data-mol-id="settings-section-signatures"]').click()
  await expect(page.locator('[data-mol-id="settings-signature"]')).toBeVisible()
  await page.locator('[data-mol-id="settings-section-security"]').click()
  await expect(page.locator('[data-mol-id="settings-security"]')).toBeVisible()
})

test('Settings — Edit profile reveals name/email inputs and a Save button', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.locator('[data-mol-id="settings-edit-profile"]').click()
  await expect(page.locator('[data-mol-id="settings-name-input"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="settings-email-input"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="settings-save-profile"]')).toBeVisible()
})

test('Settings — fetches /api/users/:id on mount', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.some(
      (r) => /\/api\/users\/[^/?]+(?:\?|$)/.test(r.url) && r.method === 'GET' && r.status === 200,
    ),
  ).toBe(true)
})
