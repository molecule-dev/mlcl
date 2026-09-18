import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiHeaders, API_BASE, signup } from './_helpers.js'

test.describe('settings persistence', () => {
  test('workspace name + subdomain + landing persist across reload', async ({ page }) => {
    const { accessToken } = await signup(page)

    await page.goto('/settings')
    await expect(page.getByTestId('settings-page')).toBeVisible()
    await expect(page.getByTestId('settings-workspace')).toBeVisible()

    await page.getByTestId('settings-workspace-name').fill('Cairn HQ')
    await page.getByTestId('settings-workspace-subdomain').fill('cairn-hq-01')
    await page.getByTestId('settings-landing-spaces').click()
    await page.getByTestId('settings-workspace-save').click()

    await expect(page.getByTestId('settings-saved-pill')).toBeVisible({ timeout: 10_000 })

    await page.reload()
    await expect(page.getByTestId('settings-workspace-name')).toHaveValue('Cairn HQ')
    await expect(page.getByTestId('settings-workspace-subdomain')).toHaveValue('cairn-hq-01')

    // Persisted in DB?
    const r = await page.request.get(`${API_BASE}/prefs/me`, { headers: apiHeaders(accessToken) })
    const prefs = (await r.json()) as {
      workspace_name: string
      subdomain: string
      default_landing: string
    }
    expect(prefs.workspace_name).toBe('Cairn HQ')
    expect(prefs.subdomain).toBe('cairn-hq-01')
    expect(prefs.default_landing).toBe('spaces')
  })

  test('theme set in settings persists across reload (DB + localStorage)', async ({ page }) => {
    const { accessToken } = await signup(page)

    await page.goto('/settings')
    await expect(page.getByTestId('settings-workspace')).toBeVisible()

    await page.getByTestId('settings-theme-dark').click()
    await page.getByTestId('settings-workspace-save').click()
    await expect(page.getByTestId('settings-saved-pill')).toBeVisible({ timeout: 10_000 })

    // Check theme provider has been switched on the live page.
    const themeNameAfter = await page.evaluate(() => window.localStorage.getItem('molecule-theme'))
    expect(themeNameAfter).toBe('dark')

    // Verify persisted in DB.
    const r = await page.request.get(`${API_BASE}/prefs/me`, { headers: apiHeaders(accessToken) })
    const prefs = (await r.json()) as { theme: string }
    expect(prefs.theme).toBe('dark')

    // Reload — theme provider should still be dark.
    await page.reload()
    const themeNameOnReload = await page.evaluate(() =>
      window.localStorage.getItem('molecule-theme'),
    )
    expect(themeNameOnReload).toBe('dark')
  })

  test('notification toggles persist across reload', async ({ page }) => {
    const { accessToken } = await signup(page)

    await page.goto('/settings')
    await page.getByTestId('settings-nav-notifications').click()
    await expect(page.getByTestId('settings-notifications')).toBeVisible()

    // Default: all true. Untick mentions, save, then re-fetch.
    await page.getByTestId('settings-notify_mentions').click()
    await page.getByTestId('settings-notifications-save').click()

    // Confirm in the API. Save fires an async PATCH, so reading once right after
    // the click raced it and still saw the old value (true) — the test failed and
    // passed on retry. Poll until the write lands.
    await expect
      .poll(
        async () => {
          const r = await page.request.get(`${API_BASE}/prefs/me`, {
            headers: apiHeaders(accessToken),
          })
          return ((await r.json()) as { notify_mentions: boolean }).notify_mentions
        },
        { timeout: 10_000, message: 'unticked mention preference must persist' },
      )
      .toBe(false)

    // And after reload the checkbox is still off.
    await page.reload()
    await page.getByTestId('settings-nav-notifications').click()
    await expect(page.getByTestId('settings-notify_mentions')).not.toBeChecked()
  })

  test('profile save updates user.name in DB', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto('/settings')
    await page.getByTestId('settings-nav-profile').click()
    await expect(page.getByTestId('settings-profile')).toBeVisible()
    await page.getByTestId('settings-profile-name').fill('Renamed Tester')

    // Wait for the PATCH to /users/:id round-trip to complete.
    const patchPromise = page.waitForResponse(
      (r) => r.url().includes('/users/') && r.request().method() === 'PATCH' && r.status() < 400,
      { timeout: 10_000 },
    )
    await page.getByTestId('settings-profile-save').click()
    await patchPromise

    const me = await page.request.get(`${API_BASE}/me`, { headers: apiHeaders(accessToken) })
    const body = (await me.json()) as { name: string }
    expect(body.name).toBe('Renamed Tester')
  })
})
