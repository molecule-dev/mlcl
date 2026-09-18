/**
 * /settings + /account — preferences must persist across reload.
 * Theme toggling is verified via localStorage; notifications + language
 * via PATCH /api/profile/me, then by re-fetching the same profile.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test('GET /api/profile/me runs on /settings load', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const get = reqs.find((r) => r.method === 'GET' && /\/api\/profile\/me/.test(r.url))
  expect(get?.status).toBe(200)
})

test('toggling email_booking_updates fires PATCH /api/profile/me and persists', async ({
  page,
}) => {
  await signup(page)
  // Set the notification flag true.
  const before = await apiRequest(page, 'PATCH', '/profile/me', {
    notifications: { email_booking_updates: true },
  })
  expect([200, 204]).toContain(before.status)

  // Now flip it false; PATCH should round-trip the new value.
  const flipped = await apiRequest(page, 'PATCH', '/profile/me', {
    notifications: { email_booking_updates: false },
  })
  expect([200, 204]).toContain(flipped.status)

  const after = await apiRequest(page, 'GET', '/profile/me')
  const data = ((after.body as { data?: unknown })?.data ?? after.body) as {
    notifications?: { email_booking_updates?: boolean }
  }
  expect(data.notifications?.email_booking_updates).toBe(false)
})

test('language change persists via /api/profile/me', async ({ page }) => {
  await signup(page)
  const set = await apiRequest(page, 'PATCH', '/profile/me', { language: 'es' })
  expect([200, 204]).toContain(set.status)

  const after = await apiRequest(page, 'GET', '/profile/me')
  const data = ((after.body as { data?: unknown })?.data ?? after.body) as { language?: string }
  expect(data.language).toBe('es')
})

test('theme toggle on /settings is persisted to localStorage and survives reload', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })

  // Switch to the Appearance tab.
  await page
    .getByRole('button', { name: /appearance/i })
    .first()
    .click()
  // The "dark" radio is wrapped in a styled label; click the label.
  await page
    .locator('label', { hasText: /^dark$/i })
    .first()
    .click()
  await page.waitForTimeout(500)

  // The theme bond persists under some localStorage key; verify any
  // surviving value mentions "dark" so reload-after-switch is real.
  const storedDark = await page.evaluate(() => {
    const entries = Object.entries(window.localStorage)
    return entries.some(([, v]) => typeof v === 'string' && /dark/.test(v))
  })
  expect(storedDark).toBe(true)

  await page.reload()
  // After reload the dark radio is still selected.
  await page
    .getByRole('button', { name: /appearance/i })
    .first()
    .click()
  await expect(page.locator('input[type="radio"][name="theme"][value="dark"]')).toBeChecked()
})
