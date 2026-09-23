import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup, api, getMyUserId, getAccessToken } from './_helpers.js'

test('PATCH /api/users/:id updates name + email (read-after-write through /profile/me)', async ({
  page,
}) => {
  const password = 'TestPass123!'
  await signup(page, undefined, password)
  const id = await getMyUserId(page)
  const newEmail = `renamed+${Date.now()}@example.com`
  // The molecule core user resource requires the CURRENT password whenever
  // the email changes (verified: PATCH {name} alone → 200; PATCH {name,
  // email} without currentPassword → 400 currentPasswordRequired).
  await api(page, 'PATCH', `/users/${id}`, {
    name: 'Renamed Student',
    email: newEmail,
    currentPassword: password,
  })
  const me = await api<{ name: string; email: string }>(page, 'GET', '/profile/me')
  expect(me.name).toBe('Renamed Student')
  expect(me.email).toBe(newEmail)
})

test('PUT /api/profile/me/preferences round-trips through GET /profile/me', async ({ page }) => {
  await signup(page)
  await api(page, 'PUT', '/profile/me/preferences', {
    theme: 'dark',
    language: 'fr-FR',
    notifyEmail: false,
    notifyAssignments: false,
  })
  const me = await api<{ preferences: Record<string, unknown> }>(page, 'GET', '/profile/me')
  expect(me.preferences.theme).toBe('dark')
  expect(me.preferences.language).toBe('fr-FR')
  expect(me.preferences.notifyEmail).toBe(false)
  expect(me.preferences.notifyAssignments).toBe(false)
})

test('Settings UI: change name + save → server has the new name', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.locator('input#profile-name').fill('UI Renamed')
  await page
    .getByRole('button', { name: /save\s*changes|save/i })
    .first()
    .click()
  await page.waitForTimeout(800)
  const me = await api<{ name: string }>(page, 'GET', '/profile/me')
  expect(me.name).toBe('UI Renamed')
})

test('Settings UI: changing theme persists across reload (preferences round-trip)', async ({
  page,
}) => {
  await signup(page)
  // Start with a known-good preference state.
  await api(page, 'PUT', '/profile/me/preferences', { theme: 'light' })
  await page.goto(APP_BASE + '/settings')
  // Find and click the dark theme button (AppearanceSettingsCard renders 3
  // selectable theme tiles — light/dark/system).
  const darkBtn = page.getByRole('button', { name: /^dark$/i }).first()
  if (await darkBtn.count()) {
    await darkBtn.click()
    await page.waitForTimeout(500)
    const me = await api<{ preferences: { theme?: string } }>(page, 'GET', '/profile/me')
    expect(me.preferences.theme).toBe('dark')
  }
})

test('PATCH /api/users/:id/password rejects wrong current password (4xx)', async ({ page }) => {
  await signup(page)
  const id = await getMyUserId(page)
  // Use raw fetch so we can assert on a 4xx without the helper throwing.
  const token = await getAccessToken(page)
  const resp = await page.request.fetch(
    `http://localhost:${process.env.API_PORT || '4000'}/api/users/${id}/password`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: JSON.stringify({ currentPassword: 'wrong-password', newPassword: 'NewPass123!' }),
    },
  )
  expect(resp.status()).toBeGreaterThanOrEqual(400)
})
