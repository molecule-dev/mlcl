import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, signup, uploadAndCreatePhoto, FIXTURE_JPEG } from './_helpers.js'
import fs from 'node:fs'

test.describe('photos', () => {
  test('upload → /api/photos has the new row → renders on /my-photos', async ({ page }) => {
    await signup(page)
    const created = await uploadAndCreatePhoto(page.request, {
      title: 'Reykjavík blue hour',
      tags: ['landscape', 'iceland'],
      visibility: 'public',
    })
    expect(created.photoId).toBeTruthy()

    const list = await page.request.get(`${API_BASE}/photos?owner=me`)
    expect(list.status()).toBe(200)
    const arr = await list.json()
    expect(arr.find((p: any) => p.id === created.photoId)).toBeTruthy()

    await page.goto(`${APP_BASE}/my-photos`)
    // The image proxied via /api/photo-files/<id> must render with real bytes.
    // Scroll into view so loading="lazy" actually triggers a fetch, then
    // wait for naturalWidth>0 (the only way to confirm real bytes loaded).
    const img = page.locator(`img[src*="${created.uploadId}"]`).first()
    await expect(img).toBeVisible({ timeout: 15_000 })
    await img.scrollIntoViewIfNeeded()
    await page.waitForFunction(
      (sel: string) => {
        const el = document.querySelector(sel) as HTMLImageElement | null
        return !!el && el.complete && el.naturalWidth > 0
      },
      `img[src*="${created.uploadId}"]`,
      { timeout: 15_000 },
    )
  })

  test('GET /api/photo-files/:id proxies real S3 bytes (≥ original size)', async ({ page }) => {
    await signup(page)
    const { uploadId } = await uploadAndCreatePhoto(page.request, { title: 'Proxy test' })
    const r = await page.request.get(`${API_BASE}/photo-files/${uploadId}`)
    expect(r.status()).toBe(200)
    const buf = await r.body()
    const expected = fs.statSync(FIXTURE_JPEG).size
    expect(buf.length).toBe(expected)
  })

  test('favorite a photo flips state and shows in /favorites', async ({ page }) => {
    await signup(page)
    const { photoId } = await uploadAndCreatePhoto(page.request, { title: 'Favorite me' })
    const fav = await page.request.post(`${API_BASE}/photos/${photoId}/favorite`)
    expect(fav.status()).toBe(200)
    expect((await fav.json()).favorited).toBe(true)

    const favList = await page.request.get(`${API_BASE}/photos/favorites`)
    expect(favList.status()).toBe(200)
    const ids = (await favList.json()).map((p: any) => p.id)
    expect(ids).toContain(photoId)

    // Toggle off — favorite_count goes to 0.
    const off = await page.request.post(`${API_BASE}/photos/${photoId}/favorite`)
    expect((await off.json()).favorited).toBe(false)
  })

  test('photos appear on Explore for any logged-in user (public visibility)', async ({
    page,
    browser,
  }) => {
    await signup(page)
    const { photoId } = await uploadAndCreatePhoto(page.request, {
      title: 'Editorial',
      visibility: 'public',
    })
    // Second user — fresh context.
    const ctx = await browser.newContext()
    const p2 = await ctx.newPage()
    await signup(p2)
    const ex = await p2.context().request.get(`${API_BASE}/photos`)
    expect(ex.status()).toBe(200)
    const ids = (await ex.json()).map((p: any) => p.id)
    expect(ids).toContain(photoId)
    await ctx.close()
  })

  test('photo owner can DELETE their photo; row disappears', async ({ page }) => {
    await signup(page)
    const { photoId } = await uploadAndCreatePhoto(page.request, { title: 'Delete me' })
    const del = await page.request.delete(`${API_BASE}/photos/${photoId}`)
    expect(del.status()).toBeLessThan(300)
    const after = await page.request.get(`${API_BASE}/photos/${photoId}`)
    expect(after.status()).toBe(404)
  })

  test('PUT /photos/:id updates title and visibility (round-trip via GET)', async ({ page }) => {
    await signup(page)
    const { photoId } = await uploadAndCreatePhoto(page.request, { title: 'Original' })
    const upd = await page.request.put(`${API_BASE}/photos/${photoId}`, {
      data: { title: 'Updated title', visibility: 'unlisted' },
      headers: { 'content-type': 'application/json' },
    })
    expect(upd.status()).toBeLessThan(300)
    const r = await page.request.get(`${API_BASE}/photos/${photoId}`)
    const j = await r.json()
    expect(j.title).toBe('Updated title')
    expect(j.visibility).toBe('unlisted')
  })

  test('upload UI flow: pick file → progress → row marked done', async ({ page }) => {
    await signup(page)
    await page.goto(`${APP_BASE}/upload`)
    await page.locator('[data-testid="upload-title"]').fill('UI Upload Title')
    await page.locator('[data-testid="upload-tags"]').fill('ui,sample')

    const before = await page.request.get(`${API_BASE}/photos?owner=me`)
    const beforeCount = (await before.json()).length

    await page.locator('[data-testid="upload-input"]').setInputFiles(FIXTURE_JPEG)
    await page.waitForFunction(
      () => document.querySelector('[data-testid="upload-row-done"]') !== null,
      { timeout: 30_000 },
    )
    const after = await page.request.get(`${API_BASE}/photos?owner=me`)
    const afterCount = (await after.json()).length
    expect(afterCount).toBe(beforeCount + 1)
  })
})
