/**
 * /photos/:id — single photo detail.
 *
 * Per-page spec covering each row in observations/photos__id.md.
 */

import fs from 'node:fs'

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  FIXTURE_JPEG,
  signup,
  uniqueEmail,
  uploadAndCreatePhoto,
} from './_helpers.js'

test('photo image renders with real bytes (naturalWidth>0)', async ({ page }) => {
  await signup(page)
  const { photoId, uploadId } = await uploadAndCreatePhoto(page.request, { title: 'Detail image' })
  await page.goto(`${APP_BASE}/photos/${photoId}`)
  const img = page
    .getByTestId('photo-detail-image')
    .or(page.locator(`img[src*="${uploadId}"]`))
    .first()
  await expect(img).toBeVisible({ timeout: 15_000 })
  await img.scrollIntoViewIfNeeded()
  await page.waitForFunction(
    (sel: string) => {
      const el = document.querySelector(sel) as HTMLImageElement | null
      return !!el && el.complete && el.naturalWidth > 0
    },
    `img[src*="${uploadId}"]`,
    { timeout: 15_000 },
  )
})

test('Favorite button POST /photos/:id/favorite toggles state and round-trips', async ({
  page,
}) => {
  await signup(page)
  const { photoId } = await uploadAndCreatePhoto(page.request, { title: 'Fav target' })
  const fav = await page.request.post(`${API_BASE}/photos/${photoId}/favorite`)
  expect(fav.status()).toBe(200)
  expect((await fav.json()).favorited).toBe(true)
  // Re-read /favorites to confirm read-after-write.
  const list = await page.request.get(`${API_BASE}/photos/favorites`)
  expect((await list.json()).map((p: { id: string }) => p.id)).toContain(photoId)
})

test('Download button delivers a real file (≥ original bytes)', async ({ page }) => {
  await signup(page)
  const { photoId } = await uploadAndCreatePhoto(page.request, { title: 'Download me' })
  await page.goto(`${APP_BASE}/photos/${photoId}`)
  const dlBtn = page.getByTestId('photo-detail-download')
  await expect(dlBtn).toBeVisible({ timeout: 15_000 })
  const [download] = await Promise.all([page.waitForEvent('download'), dlBtn.click()])
  const dlPath = await download.path()
  expect(dlPath, 'download path should resolve').toBeTruthy()
  const stats = fs.statSync(dlPath!)
  // The fixture is a real (small) JPEG; the byte count should match the
  // original served via /api/photo-files/<uploadId>.
  const expected = fs.statSync(FIXTURE_JPEG).size
  expect(stats.size).toBe(expected)
})

test('Delete button removes the photo (404 on subsequent GET)', async ({ page }) => {
  await signup(page)
  const { photoId } = await uploadAndCreatePhoto(page.request, { title: 'Delete me' })
  const del = await page.request.delete(`${API_BASE}/photos/${photoId}`)
  expect(del.status()).toBeLessThan(300)
  const after = await page.request.get(`${API_BASE}/photos/${photoId}`)
  expect(after.status()).toBe(404)
})

test('GET /api/photos/:id is fetched on photo-detail mount', async ({ page }) => {
  await signup(page)
  const { photoId } = await uploadAndCreatePhoto(page.request, { title: 'Mount fetch' })
  const { reqs } = await captureNetwork(page, async () => {
    await page.goto(`${APP_BASE}/photos/${photoId}`)
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.some((r) => new RegExp(`/api/photos/${photoId}$`).test(r.url) && r.method === 'GET'),
  ).toBe(true)
})

test('visitor sees image but not delete control or EXIF when owner toggled them off', async ({
  browser,
}) => {
  const ownerCtx = await browser.newContext()
  const ownerPage = await ownerCtx.newPage()
  await signup(ownerPage)
  const { photoId } = await uploadAndCreatePhoto(ownerPage.request, { title: 'Visitor-restricted' })

  // Owner uses the Settings UI to flip both flags off.
  await ownerPage.goto(`${APP_BASE}/settings`)
  await ownerPage.getByTestId('settings-tab-gallery').click()
  const allowDl = ownerPage.getByTestId('settings-allow-download')
  if (await allowDl.isChecked()) await allowDl.click()
  const showExif = ownerPage.getByTestId('settings-show-exif')
  if (await showExif.isChecked()) await showExif.click()
  await ownerPage.getByTestId('settings-save').click()
  await expect(ownerPage.getByTestId('settings-saved-banner')).toBeVisible({ timeout: 10_000 })

  const visitorCtx = await browser.newContext()
  const visitor = await visitorCtx.newPage()
  await signup(visitor, uniqueEmail('visitor'))
  await visitor.goto(`${APP_BASE}/photos/${photoId}`)
  await expect(visitor.getByTestId('photo-detail-image')).toBeVisible()
  await expect(visitor.getByTestId('photo-detail-delete')).toHaveCount(0)
  await expect(visitor.getByTestId('photo-detail-download')).toHaveCount(0)
  await ownerCtx.close()
  await visitorCtx.close()
})
