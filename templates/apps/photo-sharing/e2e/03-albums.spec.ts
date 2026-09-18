import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, signup, uploadAndCreatePhoto } from './_helpers.js'

test.describe('albums', () => {
  test('create album → returns id, list reflects it', async ({ page }) => {
    await signup(page)
    const r = await page.request.post(`${API_BASE}/albums`, {
      data: { title: 'My album', description: 'desc' },
      headers: { 'content-type': 'application/json' },
    })
    expect(r.status()).toBeLessThan(300)
    const album = await r.json()
    expect(album.id).toBeTruthy()
    expect(album.title).toBe('My album')

    const list = await page.request.get(`${API_BASE}/albums?owner=me`)
    expect(list.status()).toBe(200)
    const ids = (await list.json()).map((a: any) => a.id)
    expect(ids).toContain(album.id)
  })

  test('GET /albums/:id includes attached photos', async ({ page }) => {
    await signup(page)
    const album = await (
      await page.request.post(`${API_BASE}/albums`, {
        data: { title: 'Photos here' },
        headers: { 'content-type': 'application/json' },
      })
    ).json()
    const { photoId } = await uploadAndCreatePhoto(page.request, {
      title: 'In album',
      albumId: album.id,
    })
    const r = await page.request.get(`${API_BASE}/albums/${album.id}`)
    expect(r.status()).toBe(200)
    const detail = await r.json()
    const photoIds = (detail.photos || []).map((p: any) => p.id)
    expect(photoIds).toContain(photoId)
  })

  test('PUT /albums/:id renames; GET reflects new title', async ({ page }) => {
    await signup(page)
    const album = await (
      await page.request.post(`${API_BASE}/albums`, {
        data: { title: 'Old' },
        headers: { 'content-type': 'application/json' },
      })
    ).json()
    const upd = await page.request.put(`${API_BASE}/albums/${album.id}`, {
      data: { title: 'Renamed' },
      headers: { 'content-type': 'application/json' },
    })
    expect(upd.status()).toBeLessThan(300)
    const after = await (await page.request.get(`${API_BASE}/albums/${album.id}`)).json()
    expect(after.title).toBe('Renamed')
  })

  test('DELETE /albums/:id removes the album; photos detach but persist', async ({ page }) => {
    await signup(page)
    const album = await (
      await page.request.post(`${API_BASE}/albums`, {
        data: { title: 'To delete' },
        headers: { 'content-type': 'application/json' },
      })
    ).json()
    const { photoId } = await uploadAndCreatePhoto(page.request, {
      title: 'Survivor',
      albumId: album.id,
    })
    const del = await page.request.delete(`${API_BASE}/albums/${album.id}`)
    expect(del.status()).toBeLessThan(300)
    // Album gone.
    const a = await page.request.get(`${API_BASE}/albums/${album.id}`)
    expect(a.status()).toBe(404)
    // Photo survives — album_id is null.
    const p = await page.request.get(`${API_BASE}/photos/${photoId}`)
    expect(p.status()).toBe(200)
    const photo = await p.json()
    expect(photo.album_id).toBeNull()
  })

  test('Albums page UI: opens create dialog and persists a new album', async ({ page }) => {
    await signup(page)
    await page.goto(`${APP_BASE}/albums`)
    // Find the "+" / new-album trigger; selectors vary, fall back to text.
    const newBtn = page.getByRole('button', { name: /new\s*album|add|create/i }).first()
    await expect(newBtn).toBeVisible({ timeout: 10_000 })
    await newBtn.click()
    const titleInput = page.locator('input[type="text"]').last()
    await titleInput.fill('UI-Created Album ' + Date.now())
    const submit = page.getByRole('button', { name: /create|save|submit/i }).last()
    const { reqs } = await captureNetwork(page, async () => {
      await submit.click()
      await page.waitForLoadState('networkidle')
    })
    // Gate-12 contract: the create dialog must actually fire POST /api/albums.
    const createCall = reqs.find((r) => /\/api\/albums(\?|$)/.test(r.url) && r.method === 'POST')
    expect(createCall, 'POST /api/albums should fire from the create dialog').toBeTruthy()
    expect(createCall!.status).toBeLessThan(300)
    const list = await page.request.get(`${API_BASE}/albums?owner=me`)
    const albums = await list.json()
    expect(albums.some((a: any) => a.title.startsWith('UI-Created Album'))).toBe(true)
  })
})
