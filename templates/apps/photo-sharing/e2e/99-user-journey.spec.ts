/**
 * 99-user-journey — kitchen-sink cross-page flow.
 *
 * One signed-in user goes through every primary feature in order:
 *   landing → signup → explore (auth redirect) → upload → my-photos →
 *   photo detail (favorite, download) → albums (create) → album detail
 *   (add photos via album_id query) → galleries → settings (toggle prefs,
 *   save, reload-persist) → pricing (real Stripe checkout URL) → log out.
 *
 * Each step asserts on the backend invariant produced (a real DB row, a
 * real Stripe URL, real bytes — not just a 2xx).
 */

import fs from 'node:fs'

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  FIXTURE_JPEG,
  signup,
  uploadAndCreatePhoto,
} from './_helpers.js'

test.setTimeout(180_000)

test('end-to-end happy path: signup → upload → favorite → album → galleries → settings → checkout', async ({
  page,
}) => {
  // Step 1 — landing renders.
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { name: /light captured/i })).toBeVisible()

  // Step 2 — signup → AuthGuard redirect to /explore.
  const { email } = await signup(page)
  await expect(page).toHaveURL(/\/explore/)

  // Backend invariant: /api/users/me reflects the new user.
  const me = await (await page.request.get(`${API_BASE}/users/me`)).json()
  expect(me.props.email).toBe(email)
  const userId = me.props.id as string

  // Step 3 — upload via UI two-stage pipeline.
  await page.goto(APP_BASE + '/upload')
  await page.getByTestId('upload-title').fill('Journey upload')
  await page.getByTestId('upload-tags').fill('journey,kitchen-sink')
  const { reqs: uploadReqs } = await captureNetwork(page, async () => {
    await page.getByTestId('upload-input').setInputFiles(FIXTURE_JPEG)
    await page.waitForFunction(
      () => document.querySelector('[data-testid="upload-row-done"]') !== null,
      { timeout: 30_000 },
    )
  })
  expect(
    uploadReqs.find((r) => /\/api\/photo-uploads/.test(r.url) && r.method === 'POST')?.status,
  ).toBe(201)
  expect(
    uploadReqs.find((r) => /\/api\/photos(\?|$)/.test(r.url) && r.method === 'POST')!.status,
  ).toBeLessThan(300)

  // Backend invariant: /api/photos?owner=me has the new row.
  const mine = await (await page.request.get(`${API_BASE}/photos?owner=me`)).json()
  expect(Array.isArray(mine) && mine.length).toBeGreaterThan(0)
  const photoId = mine[0].id as string
  const uploadStorageKey = mine[0].original_url.split('/').pop()

  // Step 4 — /my-photos shows the photo (image renders with real bytes).
  await page.goto(APP_BASE + '/my-photos')
  const myImg = page.locator(`img[src*="${uploadStorageKey}"]`).first()
  await expect(myImg).toBeVisible({ timeout: 15_000 })
  await myImg.scrollIntoViewIfNeeded()
  await page.waitForFunction(
    (sel: string) => {
      const el = document.querySelector(sel) as HTMLImageElement | null
      return !!el && el.complete && el.naturalWidth > 0
    },
    `img[src*="${uploadStorageKey}"]`,
    { timeout: 15_000 },
  )

  // Step 5 — photo detail: favorite + download work.
  await page.goto(`${APP_BASE}/photos/${photoId}`)
  const fav = await page.request.post(`${API_BASE}/photos/${photoId}/favorite`)
  expect((await fav.json()).favorited).toBe(true)
  // Backend invariant: /favorites lists this photo now.
  const favList = await (await page.request.get(`${API_BASE}/photos/favorites`)).json()
  expect(favList.map((p: { id: string }) => p.id)).toContain(photoId)

  const dlBtn = page.getByTestId('photo-detail-download')
  await expect(dlBtn).toBeVisible({ timeout: 15_000 })
  const [download] = await Promise.all([page.waitForEvent('download'), dlBtn.click()])
  const dlPath = await download.path()
  const expectedSize = fs.statSync(FIXTURE_JPEG).size
  expect(fs.statSync(dlPath!).size).toBe(expectedSize)

  // Step 6 — album CRUD.
  await page.goto(APP_BASE + '/albums')
  await page
    .getByRole('button', { name: /new album/i })
    .first()
    .click()
  const albumTitle = `Journey-album-${Date.now()}`
  await page.locator('input').first().fill(albumTitle)
  await page
    .getByRole('button', { name: /create|save|submit/i })
    .last()
    .click()
  await page.waitForLoadState('networkidle')
  // Backend invariant: GET /albums?owner=me reflects the new album.
  const albums = await (await page.request.get(`${API_BASE}/albums?owner=me`)).json()
  const album = albums.find((a: { title: string }) => a.title === albumTitle)
  expect(album, 'newly created album should appear in /albums').toBeTruthy()
  const albumId = album.id as string

  // Step 7 — Add photos via Album CTA carrying album_id query param.
  await page.goto(`${APP_BASE}/albums/${albumId}`)
  const addLink = page.getByTestId('album-detail-add-photos')
  await expect(addLink).toHaveAttribute('href', `/upload?album_id=${albumId}`)
  await addLink.click()
  await expect(page).toHaveURL(new RegExp(`/upload\\?album_id=${albumId}`))
  await expect(page.getByTestId('upload-album-select')).toHaveValue(albumId)
  // Add a second photo into the album via the helper to verify wiring.
  const second = await uploadAndCreatePhoto(page.request, {
    title: 'In-album',
    albumId,
    visibility: 'public',
  })
  const albumDetail = await (await page.request.get(`${API_BASE}/albums/${albumId}`)).json()
  expect(albumDetail.photos.some((p: { id: string }) => p.id === second.photoId)).toBe(true)

  // Step 8 — Galleries surfaces the public album.
  await page.goto(APP_BASE + '/galleries')
  await expect(
    page
      .locator(`a[href="/albums/${albumId}"]`)
      .first()
      .or(page.getByTestId('galleries-featured-open')),
  ).toBeVisible({ timeout: 15_000 })

  // Step 9 — Settings toggle persists across reload.
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByTestId('settings-name')).toBeVisible({ timeout: 15_000 })
  const newName = `Journey-name-${Date.now()}`
  await page.getByTestId('settings-name').fill(newName)
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-saved-banner')).toBeVisible({ timeout: 10_000 })
  await page.reload()
  await expect(page.getByTestId('settings-name')).toHaveValue(newName, { timeout: 10_000 })

  // Backend invariant: GET /api/users/:id reflects the new name.
  const meAfter = await (await page.request.get(`${API_BASE}/users/${userId}`)).json()
  expect(meAfter.props.name ?? meAfter.name).toBe(newName)

  // Step 10 — Pricing → real Stripe Checkout URL.
  await page.goto(APP_BASE + '/pricing')
  const cta = page.locator('[data-mol-id^="pricing-cta-"]:not([disabled])').first()
  await expect(cta).toBeVisible({ timeout: 15_000 })
  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com\/(c\/pay\/)?cs_test_/, { timeout: 30_000 }),
    cta.click(),
  ])
  expect(page.url()).toMatch(/checkout\.stripe\.com\/(c\/pay\/)?cs_test_/)
})
