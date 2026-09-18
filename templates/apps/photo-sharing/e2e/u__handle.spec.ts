/**
 * /u/:handle — public profile.
 *
 * Per-page spec covering each row in observations/u__handle.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uploadAndCreatePhoto } from './_helpers.js'

test('GET /api/profiles/:handle returns the live profile (own uuid handle)', async ({ page }) => {
  await signup(page)
  const me = await (await page.request.get(`${API_BASE}/users/me`)).json()
  const userId = me.props.id as string
  const { photoId } = await uploadAndCreatePhoto(page.request, { title: 'Profile portfolio' })
  const r = await page.request.get(`${API_BASE}/profiles/${userId}`)
  expect(r.status()).toBe(200)
  const body = await r.json()
  expect(body.id).toBe(userId)
  expect(body.photos.some((p: { id: string }) => p.id === photoId)).toBe(true)
})

test('Profile heading visible (data-testid="profile-name")', async ({ page }) => {
  await signup(page)
  const me = await (await page.request.get(`${API_BASE}/users/me`)).json()
  const userId = me.props.id as string
  await page.goto(`${APP_BASE}/u/${userId}`)
  await expect(page.getByTestId('profile-name')).toBeVisible({ timeout: 15_000 })
})

test('Unknown handle renders profile-error testid', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/u/definitely-not-a-real-handle-xyz`)
  await expect(page.getByTestId('profile-error')).toBeVisible({ timeout: 15_000 })
})

test('GET /api/profiles/:handle 404 for unknown handles', async ({ page }) => {
  await signup(page)
  const r = await page.request.get(`${API_BASE}/profiles/definitely-not-a-real-handle-xyz`)
  expect(r.status()).toBe(404)
})

test('Profile mount fires GET /api/profiles/:handle', async ({ page }) => {
  await signup(page)
  const me = await (await page.request.get(`${API_BASE}/users/me`)).json()
  const userId = me.props.id as string
  const { reqs } = await captureNetwork(page, async () => {
    await page.goto(`${APP_BASE}/u/${userId}`)
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.some((r) => /\/api\/profiles\//.test(r.url) && r.method === 'GET')).toBe(true)
})
