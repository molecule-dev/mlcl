/**
 * /albums/:id — single album detail.
 *
 * Per-page spec covering each row in observations/albums__id.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uploadAndCreatePhoto } from './_helpers.js'

async function createAlbum(
  request: import('@playwright/test').APIRequestContext,
  title = `Album-${Date.now()}`,
) {
  const r = await request.post(`${API_BASE}/albums`, {
    data: { title, visibility: 'public' },
    headers: { 'content-type': 'application/json' },
  })
  return (await r.json()) as { id: string; title: string }
}

test('back-to-/albums link nav → /albums', async ({ page }) => {
  await signup(page)
  const album = await createAlbum(page.request)
  await page.goto(`${APP_BASE}/albums/${album.id}`)
  await page.locator('a[href="/albums"]').first().click()
  await expect(page).toHaveURL(/\/albums$/)
})

test('"Add photos" CTA href is /upload?album_id=<id>', async ({ page }) => {
  await signup(page)
  const album = await createAlbum(page.request)
  await page.goto(`${APP_BASE}/albums/${album.id}`)
  await expect(page.getByTestId('album-detail-add-photos')).toHaveAttribute(
    'href',
    `/upload?album_id=${album.id}`,
  )
})

test('Delete album removes it from /api/albums', async ({ page, request }) => {
  await signup(page)
  const album = await createAlbum(page.request, `To-delete-${Date.now()}`)
  const del = await request.delete(`${API_BASE}/albums/${album.id}`, {
    headers: {
      Cookie: (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; '),
    },
  })
  expect(del.status()).toBeLessThan(300)
  const after = await page.request.get(`${API_BASE}/albums/${album.id}`)
  expect(after.status()).toBe(404)
})

test('Delete control arms with a confirm label, then commits through the UI', async ({ page }) => {
  await signup(page)
  const album = await createAlbum(page.request, `To-delete-${Date.now()}`)
  await page.goto(`${APP_BASE}/albums/${album.id}`)
  const del = page.getByTestId('album-detail-delete')
  await expect(del).toBeVisible({ timeout: 15_000 })
  // First click ARMS the shared ConfirmButton — the confirm label (with the
  // album title interpolated) replaces the idle "Delete" label; the old
  // native window.confirm is gone.
  await del.click()
  await expect(del).toHaveText(
    `Delete album "${album.title}"? Photos in this album will not be deleted.`,
  )
  // Second click commits: the album is deleted and the page navigates to
  // /albums.
  await Promise.all([page.waitForURL(/\/albums$/), del.click()])
  const after = await page.request.get(`${API_BASE}/albums/${album.id}`)
  expect(after.status()).toBe(404)
})

test('Photo card in album grid → /photos/:id', async ({ page }) => {
  await signup(page)
  const album = await createAlbum(page.request)
  const { photoId } = await uploadAndCreatePhoto(page.request, {
    title: 'Album cover',
    albumId: album.id,
    visibility: 'public',
  })
  await page.goto(`${APP_BASE}/albums/${album.id}`)
  await page.locator(`a[href="/photos/${photoId}"]`).first().click()
  await expect(page).toHaveURL(new RegExp(`/photos/${photoId}`))
})

test('GET /api/albums/:id returns the album with attached photos (read-after-write)', async ({
  page,
}) => {
  await signup(page)
  const album = await createAlbum(page.request)
  const { photoId } = await uploadAndCreatePhoto(page.request, {
    title: 'For album',
    albumId: album.id,
  })
  const { reqs } = await captureNetwork(page, async () => {
    await page.goto(`${APP_BASE}/albums/${album.id}`)
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.some((r) => new RegExp(`/api/albums/${album.id}$`).test(r.url) && r.method === 'GET'),
  ).toBe(true)
  const detail = await (await page.request.get(`${API_BASE}/albums/${album.id}`)).json()
  expect(detail.photos.some((p: { id: string }) => p.id === photoId)).toBe(true)
})
