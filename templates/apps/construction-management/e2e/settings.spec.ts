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

  // The toggle's visible "RFI updates" text is a sibling of the label, and
  // the checkbox itself is sr-only behind the switch visual (which
  // intercepts pointer events), so click the wrapping label — the visible
  // toggle — to flip it, exactly like a user would.
  await page.locator('label:has(input[aria-label="RFI updates"])').click()
  await expect(page.getByRole('checkbox', { name: /^RFI updates$/i })).not.toBeChecked()
  await page.getByRole('button', { name: /save preferences/i }).click()
  await expect(page.locator('[data-testid="notifications-saved"]')).toBeVisible()

  const after = (await (
    await page.request.get(`${API_BASE}/profile/me`, { headers: apiHeaders(accessToken) })
  ).json()) as { preferences: { rfiUpdates?: boolean } }
  expect(after.preferences.rfiUpdates).toBe(false)
})
