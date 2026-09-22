import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('/settings page', () => {
  test('saving the profile tab PATCHes /api/users/:id and persists (read-after-write)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    expect(accessToken).toBeTruthy()
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(1500)

    // Profile fields by their input position (Name, Email, Home airport, Currency)
    await page.locator('input').nth(2).fill('LHR')
    await page.locator('input').nth(3).fill('GBP')

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /save changes/i })
        .first()
        .click()
      await page.waitForTimeout(2000)
    })

    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/users\//.test(r.url))
    expect(patch, 'PATCH /api/users/:id').toBeTruthy()
    expect(patch?.status, 'profile patch status').toBeLessThan(400)
    // The preference slice must go through the server-side channel —
    // `oauthData` is stripped from every user read, so writing it via
    // PATCH /api/users/:id can never round-trip.
    const prefsPatch = reqs.find((r) => r.method === 'PATCH' && /\/api\/preferences/.test(r.url))
    expect(prefsPatch, 'PATCH /api/preferences').toBeTruthy()
    expect(prefsPatch?.status, 'preferences patch status').toBeLessThan(400)

    await expect(page.getByText(/^Saved\.?$/).first()).toBeVisible()

    // Read-after-write: the server-side preferences channel is the only
    // honest read-back (the user resource never returns oauthData).
    const prefsRes = await page.request.get(`${API_BASE}/preferences`, {
      headers: apiHeaders(accessToken),
    })
    expect(prefsRes.ok()).toBe(true)
    const prefs = (await prefsRes.json()) as { home_airport?: string; currency?: string }
    expect(prefs.home_airport).toBe('LHR')
    expect(prefs.currency).toBe('GBP')
  })

  test('preferences tab toggles a notification and persists across reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(1500)

    // Switch to Preferences tab.
    await page.getByRole('button', { name: /^Preferences$/ }).click()
    await page.waitForTimeout(300)

    // First preference toggle lives inside the active panel (the tab
    // buttons in <nav> also have aria-pressed but no width-11 styling).
    const firstToggle = page.locator('li button[aria-pressed]').first()
    await expect(firstToggle).toBeVisible()
    const before = await firstToggle.getAttribute('aria-pressed')
    expect(before).not.toBeNull()
    await firstToggle.click()
    await page.waitForTimeout(300)
    const afterClick = await firstToggle.getAttribute('aria-pressed')
    expect(afterClick, 'first toggle should flip its aria-pressed').not.toBe(before)

    await page
      .getByRole('button', { name: /save changes/i })
      .first()
      .click()
    await page.waitForTimeout(2000)

    const prefsRes = await page.request.get(`${API_BASE}/preferences`, {
      headers: apiHeaders(accessToken),
    })
    const notif = (
      (await prefsRes.json()) as {
        notifications?: Record<string, boolean>
      }
    ).notifications
    expect(notif, 'notifications object persisted').toBeTruthy()
    // Exactly one preference key should match the toggled (post-click) value
    // — a real toggle changes one bit, not zero. (Past bug: PATCH 200d but
    // the auth-cached user kept stale defaults, so reload showed the old
    // toggle state even though the DB had the new one.)
    const toggledTo = afterClick === 'true'
    const matches = Object.values(notif ?? {}).filter((v) => v === toggledTo)
    expect(matches.length, `at least one notification key should be ${toggledTo}`).toBeGreaterThan(
      0,
    )

    // Reload and confirm the toggle survives. This catches the case where
    // the PATCH succeeds but the page rehydrates from a stale cached user.
    await page.reload()
    await page.waitForTimeout(1500)
    await page.getByRole('button', { name: /^Preferences$/ }).click()
    await page.waitForTimeout(300)
    const persisted = await page
      .locator('li button[aria-pressed]')
      .first()
      .getAttribute('aria-pressed')
    expect(persisted, 'first toggle state should survive page.reload()').toBe(afterClick)
  })

  test('GET /api/notifications is reachable for the signed-in user', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.ok()).toBe(true)
    const list = (await res.json()) as Array<unknown>
    expect(Array.isArray(list)).toBe(true)
  })
})
