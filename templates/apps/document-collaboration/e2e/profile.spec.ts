/**
 * Profile — display name, bio, cursor color, public toggle persist.
 *
 * Outcome assertions:
 * - PATCH /api/profile/me writes through to users.oauthData.dc and
 *   subsequent GET reflects the new fields.
 * - Save survives page.reload() (read-after-write across HTTP).
 * - Selecting a cursor color writes that exact value.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('profile', () => {
  test('display name + bio persist via PATCH and survive reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('prof-name'))
    await page.goto(APP_BASE + '/profile')
    await page.waitForSelector('[data-testid="profile-input-display-name"]', { timeout: 15000 })

    const newName = `Walker Q ${Date.now()}`
    const newBio = `Bio sentinel ${Date.now()}`
    await page.getByTestId('profile-input-display-name').fill(newName)
    await page.getByTestId('profile-input-bio').fill(newBio)
    await page.getByTestId('profile-input-handle').fill('walkerq')
    await page.getByTestId('profile-save').click()
    await expect(page.getByTestId('profile-saved-banner')).toBeVisible({ timeout: 10000 })

    const fresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
    })
    const body = (await fresh.json()) as {
      display_name: string
      bio: string
      handle: string | null
    }
    expect(body.display_name).toBe(newName)
    expect(body.bio).toBe(newBio)
    expect(body.handle).toBe('walkerq')

    await page.reload()
    await page.waitForSelector('[data-testid="profile-input-display-name"]')
    await expect(page.getByTestId('profile-input-display-name')).toHaveValue(newName)
    await expect(page.getByTestId('profile-input-bio')).toHaveValue(newBio)
  })

  test('cursor color selection writes through to GET', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('prof-color'))
    await page.goto(APP_BASE + '/profile')
    await page.waitForSelector('[data-testid="profile-cursor-color-#e11d48"]')
    await page.getByTestId('profile-cursor-color-#e11d48').click()
    await page.getByTestId('profile-save').click()
    await expect(page.getByTestId('profile-saved-banner')).toBeVisible({ timeout: 10000 })

    const fresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
    })
    const body = (await fresh.json()) as { cursor_color: string }
    expect(body.cursor_color).toBe('#e11d48')
  })

  test('public profile toggle persists', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('prof-public'))
    await page.goto(APP_BASE + '/profile')
    await page.waitForSelector('[data-testid="profile-public-toggle"]')

    // Default is true; flip it off.
    const before = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
    })
    const beforeBody = (await before.json()) as { public_profile: boolean }
    expect(beforeBody.public_profile).toBe(true)

    await page.getByTestId('profile-public-toggle').click()
    await page.getByTestId('profile-save').click()
    await expect(page.getByTestId('profile-saved-banner')).toBeVisible({ timeout: 10000 })

    const after = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
    })
    const afterBody = (await after.json()) as { public_profile: boolean }
    expect(afterBody.public_profile).toBe(false)
  })
})

test.describe('profile — network', () => {
  test('page load triggers GET /api/profile/me', async ({ page }) => {
    await signup(page, uniqueEmail('prof-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForSelector('[data-testid="profile-input-display-name"]', { timeout: 15000 })
    })
    expect(reqs.some((r) => r.url.includes('/api/profile/me'))).toBe(true)
  })
})
