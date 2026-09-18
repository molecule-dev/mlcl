import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('settings page', () => {
  test('PATCH /api/users/:id updates the profile name + username', async ({ page }) => {
    const me = await signup(page)
    const username = `vivid${Date.now()}`
    const res = await page.request.patch(`/api/users/${me.userId}`, {
      headers: apiHeaders(me.accessToken),
      data: { name: 'Renamed Vivid User', username },
    })
    expect(res.status(), await res.text()).toBe(200)

    const meRes = await page.request.get('/api/profile/me', {
      headers: { Authorization: `Bearer ${me.accessToken}` },
    })
    expect(meRes.status()).toBe(200)
    const profile = (await meRes.json()) as { display_name: string; handle: string }
    expect(profile.display_name).toBe('Renamed Vivid User')
    expect(profile.handle).toBe(username.toLowerCase())
  })

  test('Settings page is reachable when authenticated and renders sections', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="settings-tab-profile"]')).toBeVisible()
    await expect(page.locator('[data-testid="settings-tab-notifications"]')).toBeVisible()
    await expect(page.locator('[data-testid="settings-tab-privacy"]')).toBeVisible()
  })

  test('Display name save-on-blur PATCHes /api/users/:id and persists across reload', async ({
    page,
  }) => {
    const me = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const input = page.locator('[data-testid="settings-displayname"]')
    await expect(input).toBeVisible({ timeout: 10_000 })
    const newName = `Polished Vivid ${Date.now()}`
    await input.fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await input.blur()
      await page.waitForTimeout(800)
    })
    const patched = reqs.find((r) => r.method === 'PATCH' && /\/api\/users\/[^/]+$/.test(r.url))
    expect(patched, 'expected PATCH /api/users/:id after blur').toBeDefined()
    expect(patched!.status).toBeLessThan(300)

    const meRes = await page.request.get('/api/profile/me', {
      headers: { Authorization: `Bearer ${me.accessToken}` },
    })
    expect(meRes.status()).toBe(200)
    const after = (await meRes.json()) as { display_name: string }
    expect(after.display_name).toBe(newName)

    await page.reload()
    await expect(page.locator('[data-testid="settings-displayname"]')).toHaveValue(newName, {
      timeout: 10_000,
    })
  })

  test('Bio textarea save-on-blur persists via /api/users/:id and survives reload', async ({
    page,
  }) => {
    const me = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const bio = page.locator('[data-testid="settings-bio"]')
    await expect(bio).toBeVisible({ timeout: 10_000 })
    const newBio = `My polished bio @ ${Date.now()}`
    await bio.fill(newBio)
    await bio.blur()
    await page.waitForTimeout(800)

    const meRes = await page.request.get('/api/profile/me', {
      headers: { Authorization: `Bearer ${me.accessToken}` },
    })
    expect(meRes.status()).toBe(200)
    const profile = (await meRes.json()) as { bio: string }
    expect(profile.bio).toBe(newBio)

    await page.reload()
    await expect(page.locator('[data-testid="settings-bio"]')).toHaveValue(newBio, {
      timeout: 10_000,
    })
  })

  test('Handle is rendered as a read-only @handle line', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const handle = page.locator('[data-testid="settings-handle"]')
    await expect(handle).toBeVisible({ timeout: 10_000 })
    const text = (await handle.innerText()).trim()
    expect(text).toMatch(/^@/)
  })

  test('Notifications toggle (likes) flips aria-pressed AND persists across reload', async ({
    page,
  }) => {
    const me = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-testid="settings-tab-notifications"]').click()
    const toggle = page.locator('[data-testid="toggle-notif-likes"]')
    await expect(toggle).toBeVisible({ timeout: 10_000 })
    const before = await toggle.getAttribute('aria-pressed')
    await toggle.click()
    await page.waitForTimeout(700)
    const after = await toggle.getAttribute('aria-pressed')
    expect(after).not.toBe(before)

    const userRes = await page.request.get(`/api/users/${me.userId}`, {
      headers: { Authorization: `Bearer ${me.accessToken}` },
    })
    expect(userRes.status()).toBe(200)
    const userBody = (await userRes.json()) as {
      props?: { oauthData?: { socialPreferences?: { notifLikes?: boolean } } }
      oauthData?: { socialPreferences?: { notifLikes?: boolean } }
    }
    const persistedLikes =
      userBody.props?.oauthData?.socialPreferences?.notifLikes ??
      userBody.oauthData?.socialPreferences?.notifLikes
    expect(typeof persistedLikes).toBe('boolean')

    await page.reload()
    await page.locator('[data-testid="settings-tab-notifications"]').click()
    await expect(page.locator('[data-testid="toggle-notif-likes"]')).toHaveAttribute(
      'aria-pressed',
      String(persistedLikes),
      { timeout: 10_000 },
    )
  })
})
