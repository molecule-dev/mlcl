/**
 * /my-photos — the signed-in user's own photos.
 *
 * Per-page spec covering each row in observations/my-photos.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uploadAndCreatePhoto } from './_helpers.js'

test('Upload link → /upload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/my-photos')
  await page.locator('a[href="/upload"]').first().click()
  await expect(page).toHaveURL(/\/upload/)
})

test('A freshly uploaded photo shows up on /my-photos', async ({ page }) => {
  await signup(page)
  const { photoId, uploadId } = await uploadAndCreatePhoto(page.request, { title: 'Mine' })
  await page.goto(APP_BASE + '/my-photos')
  // Photo card renders both the link AND the proxied image — wait for the
  // testid-stamped img which is unique per-photo, avoiding strict-mode
  // ambiguity from `.or()` matching two elements at once.
  await expect(page.getByTestId(`photo-masonry-img-${photoId}`)).toBeVisible({ timeout: 15_000 })
  await expect(page.locator(`a[href="/photos/${photoId}"]`).first()).toBeVisible()
  void uploadId
})

test('GET /api/photos?owner=me fires on /my-photos mount', async ({ page }) => {
  await signup(page)
  const { reqs } = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/my-photos')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.some((r) => /\/api\/photos\?.*owner=me/.test(r.url) && r.method === 'GET')).toBe(true)
})

test('My-photos heading rendered', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/my-photos')
  expect(await page.locator('h1, h2, h3').count()).toBeGreaterThan(0)
})
