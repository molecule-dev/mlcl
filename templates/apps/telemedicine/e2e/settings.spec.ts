import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('/settings — Account, practice, availability, notifications', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Renders Settings heading + section nav (Account/Practice/Availability/Notifications)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { level: 1, name: /^Settings$/i })).toBeVisible({
      timeout: 15000,
    })
    for (const s of ['Account', 'Practice', 'Availability', 'Notifications']) {
      await expect(
        page.getByRole('button', { name: new RegExp(`^${s}$`, 'i') }).first(),
      ).toBeVisible()
    }
  })

  test('Calls GET /api/profile/me on initial load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.getByRole('heading', { name: /^Settings$/i })).toBeVisible({
        timeout: 15000,
      })
    })
    const hit = reqs.find((r) => r.method === 'GET' && r.url.includes('/api/profile/me'))
    expect(hit, 'must call GET /api/profile/me on load').toBeTruthy()
    expect(hit!.status).toBeLessThan(400)
  })

  test('Account: editing display name persists via PUT /api/profile/me and is readable on reload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const newName = `Doc-${Date.now()}`
    const nameInput = page.locator('input[name="name"]')
    await expect(nameInput).toBeVisible({ timeout: 15000 })
    await nameInput.fill(newName)

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Save changes$/i })
        .first()
        .click()
      await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10000 })
    })
    const put = reqs.find((r) => r.method === 'PUT' && r.url.includes('/api/profile/me'))
    expect(put, 'save must PUT /api/profile/me').toBeTruthy()
    expect(put!.status).toBeLessThan(400)

    // Verify persistence by reading back from the API directly.
    const refresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    const me = (await refresh.json()) as { name?: string }
    expect(me.name).toBe(newName)
  })

  test('Practice: editing licensed states persists into preferences.practice', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /^Practice$/i })
      .first()
      .click()
    const states = page.locator('input[name="licensedStates"]')
    await expect(states).toBeVisible({ timeout: 15000 })
    await states.fill('CA, NV, OR')
    await page
      .getByRole('button', { name: /^Save changes$/i })
      .first()
      .click()
    await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10000 })

    const refresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    const me = (await refresh.json()) as {
      preferences?: { practice?: { licensedStates?: string } }
    }
    expect(me.preferences?.practice?.licensedStates).toBe('CA, NV, OR')
  })

  test('Availability: timezone+day window persists into preferences.availability', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /^Availability$/i })
      .first()
      .click()
    const tz = page.locator('input[name="timezone"]')
    await expect(tz).toBeVisible({ timeout: 15000 })
    await tz.fill('America/New_York')
    await page.locator('input[name="dayStart"]').fill('07:30')
    await page.locator('input[name="dayEnd"]').fill('19:30')
    await page
      .getByRole('button', { name: /^Save changes$/i })
      .first()
      .click()
    await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10000 })

    const refresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    const me = (await refresh.json()) as {
      preferences?: { availability?: { timezone?: string; dayStart?: string; dayEnd?: string } }
    }
    expect(me.preferences?.availability?.timezone).toBe('America/New_York')
    expect(me.preferences?.availability?.dayStart).toBe('07:30')
    expect(me.preferences?.availability?.dayEnd).toBe('19:30')
  })

  test('Notifications: toggles persist into preferences.notifications', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /^Notifications$/i })
      .first()
      .click()
    const pushUrgent = page.locator('input[name="pushUrgent"]')
    await expect(pushUrgent).toBeVisible({ timeout: 15000 })
    await pushUrgent.check()
    await page
      .getByRole('button', { name: /^Save changes$/i })
      .first()
      .click()
    await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10000 })

    const refresh = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    const me = (await refresh.json()) as {
      preferences?: { notifications?: { pushUrgent?: boolean } }
    }
    expect(me.preferences?.notifications?.pushUrgent).toBe(true)
  })
})
