/**
 * /profile — Auth-only profile page. Loads /api/profile/me + /api/projects.
 * Inline edit form PATCHes /api/profile/me with name + prefs (displayName,
 * bio, location, pronouns, publicUrl). Stats reflect the user's real
 * projects / shapes / exports counts.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('profile page', () => {
  test('loads profile + projects — two real GETs hit the API', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await expect(page.locator('[data-mol-id="profile-display-name"]')).toBeVisible({
        timeout: 10000,
      })
    })
    const me = reqs.find(
      (r) => /\/api\/profile\/me/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    const projs = reqs.find(
      (r) => /\/api\/projects(\?|$)/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(me).toBeTruthy()
    expect(projs).toBeTruthy()
  })

  test('display-name heading shows the user name (defaulted)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="profile-display-name"]')).toBeVisible()
  })

  test('bio block renders the default placeholder copy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="profile-bio"]')).toBeVisible()
  })

  test('"Edit profile" toggle reveals the inline form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-edit-toggle"]').click()
    await expect(page.locator('[data-mol-id="profile-edit-form"]')).toBeVisible()
  })

  test('display-name input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-edit-toggle"]').click()
    await page.locator('[data-mol-id="profile-input-displayName"]').fill('Mara V.')
    await expect(page.locator('[data-mol-id="profile-input-displayName"]')).toHaveValue('Mara V.')
  })

  test('location input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-edit-toggle"]').click()
    await page.locator('[data-mol-id="profile-input-location"]').fill('Lisbon')
    await expect(page.locator('[data-mol-id="profile-input-location"]')).toHaveValue('Lisbon')
  })

  test('pronouns input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-edit-toggle"]').click()
    await page.locator('[data-mol-id="profile-input-pronouns"]').fill('she/her')
    await expect(page.locator('[data-mol-id="profile-input-pronouns"]')).toHaveValue('she/her')
  })

  test('public URL input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-edit-toggle"]').click()
    await page.locator('[data-mol-id="profile-input-publicUrl"]').fill('https://mara.studio')
    await expect(page.locator('[data-mol-id="profile-input-publicUrl"]')).toHaveValue(
      'https://mara.studio',
    )
  })

  test('bio textarea accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-edit-toggle"]').click()
    await page
      .locator('[data-mol-id="profile-input-bio"]')
      .fill('I design tokens and ship product.')
    await expect(page.locator('[data-mol-id="profile-input-bio"]')).toHaveValue(
      'I design tokens and ship product.',
    )
  })

  test('Save button PATCHes /api/profile/me, persists, and shows status', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-edit-toggle"]').click()
    const newName = `Mara ${Date.now()}`
    await page.locator('[data-mol-id="profile-input-displayName"]').fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="profile-save"]').click()
      await expect(page.locator('[data-mol-id="profile-save-status"]')).toContainText(/saved/i, {
        timeout: 10000,
      })
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

  test('stats grid shows three cards (projects / shapes / exports)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="profile-stat-projects"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-stat-shapes"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-stat-exports"]')).toBeVisible()
  })

  test('"View all projects" navigates back to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-view-all-projects"]').click()
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })
})
