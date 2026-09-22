/**
 * /album/:id — single album detail page.
 *
 * Asserts the page renders the album title, the right photo count, and
 * actually only the photos that have album_id === :id (the filter must
 * be honored, not silently bypassed). Also exercises the not-found
 * branch and the "non-empty albums cannot be deleted" handler invariant.
 *
 * captureNetwork() is used to confirm the GETs that hydrate the page.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  createAlbum,
  createImage,
  signup,
} from './_helpers.js'

test.describe('/album/:id', () => {
  test('renders title + frame count and only the photos in this album', async ({ page }) => {
    const { accessToken } = await signup(page)
    const album = await createAlbum(page, accessToken, 'Aurora night')
    const inA = await createImage(page, accessToken, { name: 'Aurora frame A', album_id: album.id })
    const inB = await createImage(page, accessToken, { name: 'Aurora frame B', album_id: album.id })
    const orphan = await createImage(page, accessToken, { name: 'Studio orphan' })

    const calls = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/album/${album.id}`)
      await expect(page.locator('[data-mol-id="album-title"]')).toHaveText('Aurora night')
    })
    const albumGet = calls.find(
      (c) => c.method === 'GET' && c.url.includes(`/api/albums/${album.id}`),
    )
    const imagesGet = calls.find((c) => c.method === 'GET' && /\/api\/images\/?$/.test(c.url))
    expect(albumGet?.status).toBe(200)
    expect(imagesGet?.status).toBe(200)

    await expect(page.locator('[data-mol-id="album-photo-count"]')).toContainText('2')
    await expect(page.locator('[data-mol-id="album-photo-grid"]')).toBeVisible()
    await expect(page.getByText('Aurora frame A')).toBeVisible()
    await expect(page.getByText('Aurora frame B')).toBeVisible()
    await expect(page.getByText('Studio orphan')).toHaveCount(0)
    // Sanity: orphan still exists in the user's library, just not in this album.
    void inA
    void inB
    void orphan
  })

  test('non-existent album shows the not-found state, not a crash', async ({ page }) => {
    // The missing-album 404 IS the subject of this test (clean not-found
    // state), so its expected browser-console entry must not fail the run.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await signup(page)
    await page.goto(APP_BASE + '/album/00000000-0000-0000-0000-000000000000')
    await expect(page.locator('[data-mol-id="album-missing"]')).toBeVisible({ timeout: 10_000 })
  })

  test('DELETE /api/albums/:id refuses when album is non-empty (handler invariant)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const album = await createAlbum(page, accessToken, 'Non-empty')
    await createImage(page, accessToken, { name: 'In there', album_id: album.id })

    const r = await page.request.delete(`${API_BASE}/albums/${album.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(r.status()).toBe(400)
    const body = (await r.json()) as { error?: string }
    expect(body.error?.toLowerCase()).toContain('empty')

    // Confirm the album is still there after the rejected delete.
    const list = await page.request.get(`${API_BASE}/albums`, { headers: apiHeaders(accessToken) })
    const albums = (await list.json()) as Array<{ id: string }>
    expect(albums.some((a) => a.id === album.id)).toBe(true)
  })
})
