import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('Settings page (/settings)', () => {
  test('renders the side-nav heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  })

  test('renders the side-nav navigation', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('navigation', { name: /settings sections/i })).toBeVisible()
  })

  test('Profile section is the default and renders the profile heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: 'Profile', level: 2 })).toBeVisible()
  })

  test('Preferences button switches to the preferences section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: 'Preferences' }).click()
    await page.waitForTimeout(300)
    expect(page.url()).toContain('#preferences')
  })

  test('Notifications button switches to the notifications section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: 'Notifications' }).click()
    await page.waitForTimeout(300)
    expect(page.url()).toContain('#notifications')
  })

  test('Payment button switches to the payment section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: 'Payment' }).click()
    await page.waitForTimeout(300)
    expect(page.url()).toContain('#payment')
  })

  test('Display name input accepts edits', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByLabel('Display name').fill('New Name')
    await expect(page.getByLabel('Display name')).toHaveValue('New Name')
  })

  test('Email input shows the signup email', async ({ page }) => {
    const user = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByLabel('Email')).toHaveValue(user.email)
  })

  test('City input accepts a value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByLabel('City').fill('Brooklyn')
    await expect(page.getByLabel('City')).toHaveValue('Brooklyn')
  })

  test('Save profile persists the new name (read-after-write via /api/users/:id)', async ({
    page,
  }) => {
    const user = await signup(page)
    const newName = 'Snagr Test ' + Date.now()
    await page.goto(APP_BASE + '/settings')
    const reqs = await captureNetwork(page, async () => {
      await page.getByLabel('Display name').fill(newName)
      await page.getByLabel('City').fill('Brooklyn')
      await page.getByRole('button', { name: /save profile/i }).click()
      await page.waitForTimeout(2000)
    })
    const userPatch = reqs.filter(
      (r) => new RegExp(`/api/users/${user.userId}`).test(r.url) && r.method === 'PATCH',
    )
    const settingsPut = reqs.filter((r) => /\/api\/user-settings/.test(r.url) && r.method === 'PUT')
    expect(
      userPatch.length + settingsPut.length,
      'profile-save fired at least one PATCH/PUT',
    ).toBeGreaterThan(0)

    // Read-after-write: GET /api/users/:id reflects the new name.
    const reread = await page.request.get(`${API_BASE}/users/${user.userId}`, {
      headers: apiHeaders(user.accessToken),
    })
    expect(reread.status()).toBe(200)
    const body = (await reread.json()) as Record<string, unknown> & {
      props?: Record<string, unknown>
    }
    const persistedName =
      (body.name as string | undefined) ?? (body.props?.name as string | undefined) ?? null
    expect(persistedName, 'name persisted on server').toBe(newName)
  })

  test('Settings page-load fetches /api/user-settings', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForTimeout(1000)
    })
    const calls = reqs.filter((r) => /\/api\/user-settings/.test(r.url) && r.method === 'GET')
    expect(calls.length, 'GET /api/user-settings fired').toBeGreaterThan(0)
    expect(calls.every((r) => r.status === 200)).toBe(true)
  })

  test('Both /api/user-settings and /api/user_settings aliases respond 200 for the same row', async ({
    page,
  }) => {
    const user = await signup(page)
    const dash = await page.request.get(`${API_BASE}/user-settings`, {
      headers: apiHeaders(user.accessToken),
    })
    const under = await page.request.get(`${API_BASE}/user_settings`, {
      headers: apiHeaders(user.accessToken),
    })
    expect(dash.status(), 'GET /api/user-settings').toBe(200)
    expect(under.status(), 'GET /api/user_settings').toBe(200)
  })
})
