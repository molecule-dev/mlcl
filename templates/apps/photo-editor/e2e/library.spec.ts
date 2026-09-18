/**
 * /library — Lustra's photo grid + album rail + "new edit" modal.
 *
 * Asserts that:
 *   - the page actually loads images + albums from the API (read GET → render)
 *   - opening the "New edit" modal and submitting POSTs /images and the new
 *     row appears on next GET (read-after-write) AND the page navigates to
 *     /editor?photo=:id
 *   - filter chips re-filter the grid (the count text changes)
 *   - album rail tiles link to /album/:id
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  createAlbum,
  createImage,
  listImages,
  signup,
} from './_helpers.js'

test.describe('library', () => {
  test('empty library shows the empty hero + empty CTA opens new-edit modal', async ({ page }) => {
    await signup(page)
    await expect(page.locator('[data-mol-id="library-hero-headline"]')).toHaveAttribute(
      'data-photo-count',
      '0',
    )
    await expect(page.locator('[data-mol-id="library-empty"]')).toBeVisible()
    await page.locator('[data-mol-id="library-empty-cta"]').click()
    await expect(page.locator('[data-mol-id="library-new-modal"]')).toBeVisible()
  })

  test('creating an image via the modal POSTs /images and routes to /editor?photo=:id', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.locator('[data-mol-id="library-empty-cta"]').click()
    await page.locator('[data-mol-id="library-new-name"]').fill('Twilight Test')
    await page
      .locator('[data-mol-id="library-new-url"]')
      .fill('https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=800')
    const calls = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="library-new-submit"]').click()
      await page.waitForURL(/\/editor\?photo=/, { timeout: 15_000 })
    })
    const post = calls.find((r) => /\/api\/images\/?$/.test(r.url) && r.method === 'POST')
    expect(post?.status).toBe(201)

    // Read-after-write: GET /images must include this image.
    const list = await listImages(page, accessToken)
    expect(list.some((img) => img.name === 'Twilight Test')).toBe(true)
  })

  test('library reflects images created out-of-band via direct API', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createImage(page, accessToken, { name: 'Direct API frame' })
    await page.goto(APP_BASE + '/library')
    await expect(page.locator('[data-mol-id="library-hero-headline"]')).toHaveAttribute(
      'data-photo-count',
      '1',
    )
    await expect(page.getByText('Direct API frame')).toBeVisible()
  })

  test('filter chips update the visible count and reflect filter id', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createImage(page, accessToken, { name: 'Frame A' })
    await createImage(page, accessToken, { name: 'Frame B' })
    await page.goto(APP_BASE + '/library')
    await expect(page.locator('[data-mol-id="library-filter-all"]')).toHaveAttribute(
      'data-active',
      'true',
    )
    await page.locator('[data-mol-id="library-filter-edited"]').click()
    await expect(page.locator('[data-mol-id="library-filter-edited"]')).toHaveAttribute(
      'data-active',
      'true',
    )
    // No frames have edits yet → empty placeholder visible.
    await expect(page.locator('[data-mol-id="library-empty"]')).toBeVisible()
    // Switching back to "all" restores the grid.
    await page.locator('[data-mol-id="library-filter-all"]').click()
    await expect(page.locator('[data-mol-id="library-empty"]')).toHaveCount(0)
  })

  test('album tiles render and link into /album/:id when an album exists', async ({ page }) => {
    const { accessToken } = await signup(page)
    const album = await createAlbum(page, accessToken, 'Reykjavík roll')
    await page.goto(APP_BASE + '/library')
    const tile = page.locator(`[data-mol-id="library-album-${album.id}"]`)
    await expect(tile).toBeVisible()
    await tile.click()
    await page.waitForURL(new RegExp(`/album/${album.id}`))
    await expect(page.locator('[data-mol-id="album-title"]')).toHaveText(/Reykjav/)
  })

  test('GET /albums ordering is alphabetical (handler invariant)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createAlbum(page, accessToken, 'Zebra studio')
    await createAlbum(page, accessToken, 'Alpine series')
    await createAlbum(page, accessToken, 'Mountain dusk')
    const res = await page.request.get(`${API_BASE}/albums`, { headers: apiHeaders(accessToken) })
    expect(res.status()).toBe(200)
    const albums = (await res.json()) as Array<{ name: string }>
    const names = albums.map((a) => a.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sorted)
  })
})
