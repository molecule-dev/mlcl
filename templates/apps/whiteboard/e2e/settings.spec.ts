import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { signup, api, captureNetwork, APP_BASE } from './_helpers'

test.describe('settings — profile, appearance, notifications, security', () => {
  test('opens on profile tab and saving the form PATCHes /api/users/:id', async ({ page }) => {
    const { firstName } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-mol-id="settings-profile-card"]')).toBeVisible()
    // Pre-filled with the auth user's name.
    const nameInput = page.locator('[data-mol-id="settings-name"]')
    await expect(nameInput).toHaveValue(new RegExp(firstName))
    // Username must be unique per run — appended timestamp prevents 403 from
    // hitting the global username-uniqueness check across test re-runs.
    const uniqueName = `Updated${Date.now()}`
    const uniqueUsername = `user${Date.now()}`
    await nameInput.fill(uniqueName)
    await page.locator('[data-mol-id="settings-username"]').fill(uniqueUsername)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-save"]').click()
      await expect(page.locator('[data-mol-id="settings-status"]')).toContainText(/saved/i)
    })
    expect(
      reqs.some((r) => r.method === 'PATCH' && /\/api\/users\//.test(r.url) && r.status < 400),
      `expected PATCH /api/users/:id from settings-save — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
    // Backend invariant: GET /api/users/me reflects new name.
    const me = await api<{ name?: string; username?: string }>(page, 'GET', '/users/me')
    expect(me.name).toBe(uniqueName)
    expect(me.username).toBe(uniqueUsername)
  })

  test('appearance tab persists selected theme to localStorage and survives reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-tab-appearance"]').click()
    await expect(page.locator('[data-mol-id="settings-appearance"]')).toBeVisible()
    await page.locator('[data-mol-id="settings-theme-dark"]').click()
    const ls = await page.evaluate(() => window.localStorage.getItem('whiteboard:theme'))
    expect(ls).toBe('dark')
    await page.reload()
    await page.locator('[data-mol-id="settings-tab-appearance"]').click()
    const lsAfter = await page.evaluate(() => window.localStorage.getItem('whiteboard:theme'))
    expect(lsAfter).toBe('dark')
  })

  test('notification preferences toggle persists to localStorage', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-tab-notifications"]').click()
    await expect(page.locator('[data-mol-id="settings-notifications"]')).toBeVisible()
    const digest = page.locator('[data-mol-id="settings-pref-digest"] input[type="checkbox"]')
    await expect(digest).not.toBeChecked()
    await digest.check()
    const stored = await page.evaluate(
      () => window.localStorage.getItem('whiteboard:notificationPrefs') ?? '',
    )
    expect(stored).toContain('"digest":true')
    await page.reload()
    await page.locator('[data-mol-id="settings-tab-notifications"]').click()
    await expect(
      page.locator('[data-mol-id="settings-pref-digest"] input[type="checkbox"]'),
    ).toBeChecked()
  })

  test('security tab renders descriptive copy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-tab-security"]').click()
    await expect(page.locator('[data-mol-id="settings-security"]')).toBeVisible()
  })
})
