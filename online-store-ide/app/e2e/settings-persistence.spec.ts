import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup } from './_helpers.js'

test.describe('/settings persistence', () => {
  test('phone, location, notification toggles round-trip via API', async ({ page, request }) => {
    await signup(page)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    const settings = {
      phone: '+15551234567',
      location: 'Brooklyn, NY',
      notifications: {
        orderUpdates: false,
        promotions: true,
        priceDrops: true,
        newsletter: false,
      },
    }
    // The platform user resource never returns oauthData on reads, so the
    // personal slice must round-trip through the server-side /api/settings
    // channel (the same one the Settings page uses).
    const r = await request.patch(API_BASE + '/settings', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: settings,
    })
    expect(r.ok()).toBeTruthy()

    const me = await request.get(API_BASE + '/settings', { headers: { Cookie: cookieHeader } })
    const stored = (await me.json()) as typeof settings & {
      notifications: Record<string, boolean>
    }
    expect(stored.phone).toBe(settings.phone)
    expect(stored.location).toBe(settings.location)
    expect(stored.notifications.orderUpdates).toBe(false)
    expect(stored.notifications.promotions).toBe(true)
    expect(stored.notifications.priceDrops).toBe(true)
    expect(stored.notifications.newsletter).toBe(false)
  })

  test('UI Save button persists phone+location and survives reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    const phoneInput = page.locator('[data-mol-id="input-phone"]')
    const locationInput = page.locator('[data-mol-id="input-location"]')
    await expect(phoneInput).toBeVisible({ timeout: 10_000 })
    await expect(locationInput).toBeVisible({ timeout: 10_000 })

    const phone = '+13125550' + String(Math.floor(Math.random() * 1000)).padStart(3, '0')
    const location = 'Chicago, IL ' + Date.now()

    await phoneInput.fill(phone)
    await locationInput.fill(location)

    // Save PATCHes the profile (/api/users/me) and then the personal
    // slice (/api/settings) — wait for the FINAL write so the reload
    // below can only observe post-save state.
    await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/settings$/.test(r.url()) && r.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      page.locator('[data-mol-id="save-settings"]').click(),
    ])

    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await expect(phoneInput).toHaveValue(phone, { timeout: 10_000 })
    await expect(locationInput).toHaveValue(location, { timeout: 10_000 })
  })
})
