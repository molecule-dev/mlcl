/**
 * /favorites — the photos the signed-in user has favorited.
 *
 * Per-page spec covering each row in observations/favorites.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uploadAndCreatePhoto } from './_helpers.js'

test('Favorites heading rendered', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/favorites')
  expect(await page.locator('h1, h2, h3').count()).toBeGreaterThan(0)
})

test('Empty state for a user with zero favorites', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/favorites')
  // The page must NOT crash; body should have visible copy.
  expect((await page.locator('body').innerText()).length).toBeGreaterThan(20)
})

test('Favoriting a photo makes it appear on /favorites', async ({ page }) => {
  await signup(page)
  const { photoId, uploadId } = await uploadAndCreatePhoto(page.request, {
    title: 'Favourite-target',
  })
  const fav = await page.request.post(`${API_BASE}/photos/${photoId}/favorite`)
  expect((await fav.json()).favorited).toBe(true)
  await page.goto(APP_BASE + '/favorites')
  // Page renders the photo via /api/photo-files/<uploadId>.
  // Photo card renders both the link AND the proxied image — wait for the
  // testid-stamped img which is unique per-photo, avoiding strict-mode
  // ambiguity from `.or()` matching two elements at once.
  await expect(page.getByTestId(`photo-masonry-img-${photoId}`)).toBeVisible({ timeout: 15_000 })
  // Also confirm the card link exists (so we know the masonry actually mounted).
  await expect(page.locator(`a[href="/photos/${photoId}"]`).first()).toBeVisible()
  void uploadId
})

test('GET /api/photos/favorites is fetched on /favorites mount', async ({ page }) => {
  await signup(page)
  const { reqs } = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/favorites')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.some((r) => /\/api\/photos\/favorites/.test(r.url) && r.method === 'GET')).toBe(true)
})
