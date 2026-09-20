import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, signup } from './_helpers.js'

test('settings page renders every section', async ({ page }) => {
  const { accessToken } = await signup(page)
  expect(accessToken).toBeTruthy()
  await page.goto('/settings')
  for (const section of [/profile/i, /notifications/i, /appearance/i, /account/i]) {
    await expect(page.getByRole('heading', { name: section })).toBeVisible()
  }
})

test('saving notification preferences round-trips through the profile API', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto('/settings')

  const before = (await (
    await page.request.get(`${API_BASE}/profile/me`, { headers: apiHeaders(accessToken) })
  ).json()) as { preferences: { punchUpdates?: boolean; rfiUpdates?: boolean } }
  expect(before.preferences.rfiUpdates).toBe(true)

  await page
    .locator('label:has(input[type="checkbox"])')
    .filter({ hasText: /RFI updates/i })
    .locator('input[type="checkbox"]')
    .first()
    .uncheck()
  await page.getByRole('button', { name: /save preferences/i }).click()
  await expect(page.locator('[data-testid="notifications-saved"]')).toBeVisible()

  const after = (await (
    await page.request.get(`${API_BASE}/profile/me`, { headers: apiHeaders(accessToken) })
  ).json()) as { preferences: { rfiUpdates?: boolean } }
  expect(after.preferences.rfiUpdates).toBe(false)
})
