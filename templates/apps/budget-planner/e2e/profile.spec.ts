import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

test('Profile page shows the signed-in user name + email', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings/profile')
  await expect(page.getByRole('heading', { name: /^profile$/i })).toBeVisible()
  await expect(page.getByTestId('profile-display-email')).toBeVisible()
})

test('Updating name PATCHes /api/profile/me and shows success feedback', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings/profile')
  await page.locator('input#profile-name').fill('Renamed User')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByRole('status')).toBeVisible({ timeout: 10000 })
  })
  const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/profile\/me/.test(r.url))
  expect(patch?.status).toBeLessThan(300)
  // Read after write: GET /api/profile/me reflects the new name
  const me = await api<Record<string, string>>(page, 'GET', '/profile/me')
  expect(me.name).toBe('Renamed User')
})

test('Send password reset email link routes to /forgot-password', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings/profile')
  await page.getByRole('link', { name: /send password reset email/i }).click()
  await expect(page).toHaveURL(/\/forgot-password/)
})
