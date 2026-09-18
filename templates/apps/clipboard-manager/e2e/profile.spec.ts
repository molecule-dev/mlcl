/**
 * /profile — GET/PATCH /api/profile/me. Updates name + email through
 * the form and renders the active-sessions table sourced from
 * /api/devices.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('profile page', () => {
  test("renders the user's name + email after first paint", async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="profile-email"]')).toContainText(email, {
      timeout: 15000,
    })
    await expect(page.locator('input#profile-name-input')).toHaveValue('Test User')
  })

  test('initial load fires GET /api/profile/me + GET /api/devices', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('networkidle')
    })
    const profile = reqs.find((r) => /\/api\/profile\/me/.test(r.url) && r.status === 200)
    const devices = reqs.find((r) => /\/api\/devices(?:\?|$)/.test(r.url) && r.status === 200)
    expect(profile, JSON.stringify(reqs)).toBeTruthy()
    expect(devices, JSON.stringify(reqs)).toBeTruthy()
  })

  test('saving a new name persists to the backend (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    const fresh = 'Renamed ' + Date.now()
    await page.locator('input#profile-name-input').fill(fresh)
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.locator('[data-mol-id="profile-feedback"]')).toBeVisible({ timeout: 15000 })
    const res = await page.request.get(`${API_BASE}/profile/me`, {
      headers: { Authorization: 'Bearer ' + accessToken },
    })
    const body = (await res.json()) as { name: string }
    expect(body.name).toBe(fresh)
  })

  test('saving a new email updates the user record', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    const fresh = uniqueEmail('renamed')
    await page.locator('input#profile-email-input').fill(fresh)
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.locator('[data-mol-id="profile-feedback"]')).toBeVisible({ timeout: 15000 })
    const res = await page.request.get(`${API_BASE}/profile/me`, {
      headers: { Authorization: 'Bearer ' + accessToken },
    })
    const body = (await res.json()) as { email: string }
    expect(body.email).toBe(fresh)
  })

  test("avatar shows the user's initials", async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="profile-avatar"]')).toContainText(/T/, {
      timeout: 15000,
    })
  })

  test('Active sessions table renders the current row with the "Current" badge', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="sessions-list"]')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/current/i).first()).toBeVisible()
  })
})
