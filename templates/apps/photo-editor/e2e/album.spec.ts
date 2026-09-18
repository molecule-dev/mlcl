/**
 * /album/:id — single album detail page.
 *
 * Asserts the page renders the album title, the right photo count, and
 * actually only the photos that have album_id === :id (the filter must
 * be honored, not silently bypassed).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, createAlbum, createImage, signup } from './_helpers.js'

test.describe('album detail', () => {
  test('renders title, frame count, and only the photos in this album', async ({ page }) => {
    const { accessToken } = await signup(page)
    const album = await createAlbum(page, accessToken, 'Aurora night')
    const inAlbum1 = await createImage(page, accessToken, {
      name: 'Aurora frame A',
      album_id: album.id,
    })
    const inAlbum2 = await createImage(page, accessToken, {
      name: 'Aurora frame B',
      album_id: album.id,
    })
    const elsewhere = await createImage(page, accessToken, { name: 'Studio orphan' })

    await page.goto(APP_BASE + `/album/${album.id}`)
    await expect(page.locator('[data-mol-id="album-title"]')).toHaveText('Aurora night')
    await expect(page.locator('[data-mol-id="album-photo-count"]')).toContainText('2')
    await expect(page.locator('[data-mol-id="album-photo-grid"]')).toBeVisible()
    await expect(page.getByText('Aurora frame A')).toBeVisible()
    await expect(page.getByText('Aurora frame B')).toBeVisible()
    await expect(page.getByText('Studio orphan')).toHaveCount(0)

    // Sanity: confirm the orphan really exists in the user's library, just not in this album.
    const list = await page.request.get(`${API_BASE}/images`, { headers: apiHeaders(accessToken) })
    const all = (await list.json()) as Array<{ id: string }>
    expect(all.find((i) => i.id === elsewhere.id)).toBeTruthy()
    expect(all.find((i) => i.id === inAlbum1.id)).toBeTruthy()
    expect(all.find((i) => i.id === inAlbum2.id)).toBeTruthy()
  })

  test('non-existent album shows the not-found state, not a crash', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/album/00000000-0000-0000-0000-000000000000')
    await expect(page.locator('[data-mol-id="album-missing"]')).toBeVisible({ timeout: 10_000 })
  })

  test('DELETE /albums/:id refuses when album is non-empty (handler invariant)', async ({
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
