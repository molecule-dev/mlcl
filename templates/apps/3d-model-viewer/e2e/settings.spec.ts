import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, getMyUserId, signup } from './_helpers.js'

test.describe('settings — profile updates round-trip and survive reload', () => {
  test('Settings page renders profile form fields after auth', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-testid="profile-first-name"]')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('[data-testid="profile-last-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-save"]')).toBeVisible()
  })

  test('Settings sub-nav heading "Profile" is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /Profile/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Username input accepts text and is included in the saved payload', async ({ page }) => {
    await signup(page)
    const myId = await getMyUserId(page)
    await page.goto(APP_BASE + '/settings')
    const usernameInput = page.locator('[data-testid="profile-username"]')
    await expect(usernameInput).toBeVisible({ timeout: 10_000 })
    const newUsername = `tess${Date.now().toString().slice(-6)}`
    await usernameInput.fill(newUsername)
    await page.waitForTimeout(300)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="profile-save"]').click()
      await page.waitForTimeout(2000)
    })
    const patchCall = reqs.find((r) => /\/api\/users\/[^/]+$/.test(r.url) && r.method === 'PATCH')
    expect(patchCall).toBeTruthy()
    expect(patchCall!.status).toBeLessThan(300)
    const after = await api<{ username?: string; props?: { username?: string } }>(
      page,
      'GET',
      `/users/${myId}`,
    )
    const persistedUsername = after.username ?? after.props?.username ?? ''
    expect(persistedUsername).toBe(newUsername)
  })

  test('Profile name update persists in DB AND survives reload', async ({ page }) => {
    await signup(page)
    const myId = await getMyUserId(page)

    await page.goto(APP_BASE + '/settings')

    const firstNameInput = page.locator('[data-testid="profile-first-name"]')
    const lastNameInput = page.locator('[data-testid="profile-last-name"]')
    await expect(firstNameInput).toBeVisible({ timeout: 10_000 })

    const newFirst = `Updated${Date.now().toString().slice(-4)}`
    const newLast = `User${Date.now().toString().slice(-4)}`
    await firstNameInput.fill(newFirst)
    await lastNameInput.fill(newLast)
    // Wait a moment for React state to commit, then click the save button
    // by data-testid so we don't accidentally target a sibling.
    await page.waitForTimeout(300)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="profile-save"]').click()
      await page.waitForTimeout(2500)
    })
    const patchCall = reqs.find((r) => /\/api\/users\/[^/]+$/.test(r.url) && r.method === 'PATCH')
    expect(patchCall, 'PATCH /api/users/:id fired on Save click').toBeTruthy()
    expect(patchCall!.status, 'PATCH succeeded').toBeLessThan(300)

    // Read-after-write via API: name persisted server-side.
    const after = await api<{ name?: string; props?: { name?: string } }>(
      page,
      'GET',
      `/users/${myId}`,
    )
    const persistedName = after.name ?? after.props?.name ?? ''
    expect(persistedName, 'API reflects saved name').toContain(newFirst)
    expect(persistedName, 'API reflects saved last name').toContain(newLast)

    // Reload — inputs re-hydrate to the saved values.
    await page.reload()
    await expect(firstNameInput).toBeVisible({ timeout: 10_000 })
    await expect(firstNameInput).toHaveValue(newFirst, { timeout: 10_000 })
  })
})
