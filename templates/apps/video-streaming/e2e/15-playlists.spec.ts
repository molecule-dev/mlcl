import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authedFetch, captureNetwork, pickVideo, signup } from './_helpers.js'

test.describe('playlists CRUD + /playlist/:id page', () => {
  test('create → add video → fetch → delete round-trips through /api/playlists', async ({
    page,
  }) => {
    await signup(page)
    // The video added to the playlist is read from the catalog, not named:
    // the demo videos are the first thing an app's owner replaces.
    const video = await pickVideo(page)

    const created = await authedFetch<{
      id?: string
      data?: { id?: string }
      props?: { id?: string }
    } | null>(page, `${API_BASE}/playlists`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E playlist',
        description: 'created by spec',
        is_public: true,
      }),
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    const cb =
      (created.body as { id?: string; data?: { id?: string }; props?: { id?: string } } | null) ??
      {}
    const playlistId = cb.id ?? cb.data?.id ?? cb.props?.id ?? ''
    expect(playlistId, 'POST /playlists must return the new id').toBeTruthy()

    const added = await authedFetch(page, `${API_BASE}/playlists/${playlistId}/videos`, {
      method: 'POST',
      body: JSON.stringify({ video_id: video.id }),
    })
    expect(added.status).toBe(201)

    const got = await authedFetch<{ videos?: Array<{ id?: string }> }>(
      page,
      `${API_BASE}/playlists/${playlistId}`,
    )
    expect(got.status).toBe(200)
    const videos = got.body?.videos ?? []
    expect(videos.length).toBe(1)
    expect(videos[0]?.id).toBe(video.id)

    const removed = await authedFetch(
      page,
      `${API_BASE}/playlists/${playlistId}/videos/${video.id}`,
      { method: 'DELETE' },
    )
    expect(removed.status).toBe(200)

    const deleted = await authedFetch(page, `${API_BASE}/playlists/${playlistId}`, {
      method: 'DELETE',
    })
    expect(deleted.status).toBe(204)
  })

  test('GET /api/playlists requires auth', async ({ page }) => {
    const r = await page.request.get(API_BASE + '/playlists', { failOnStatusCode: false })
    expect(r.status()).toBe(401)
  })

  test("GET /playlists/:id 404s for someone else's private playlist", async ({ page, browser }) => {
    await signup(page)
    const created = await authedFetch<{ id?: string; data?: { id?: string } }>(
      page,
      `${API_BASE}/playlists`,
      {
        method: 'POST',
        body: JSON.stringify({ name: 'private one', is_public: false }),
      },
    )
    const id =
      (created.body as { id?: string; data?: { id?: string } } | null)?.id ??
      (created.body as { data?: { id?: string } } | null)?.data?.id
    expect(id).toBeTruthy()

    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()
    await signup(page2)
    const peek = await authedFetch(page2, `${API_BASE}/playlists/${id}`)
    expect(peek.status).toBe(404)
    await ctx2.close()
  })

  test('/playlist/:id renders the picker UI and Add → POST /api/playlists/:id/videos works', async ({
    page,
  }) => {
    await signup(page)
    const created = await authedFetch<{ id?: string; data?: { id?: string } }>(
      page,
      `${API_BASE}/playlists`,
      {
        method: 'POST',
        body: JSON.stringify({ name: 'Walk-through playlist', is_public: true }),
      },
    )
    const cb = (created.body as { id?: string; data?: { id?: string } } | null) ?? {}
    const id = cb.id ?? cb.data?.id
    expect(id).toBeTruthy()

    // Pre-load: click Add catalog endpoint so the page sees /api/videos.
    const videosResponseP = page.waitForResponse(
      (r) =>
        /\/api\/videos(?:\?|$)/.test(r.url()) &&
        r.request().method() === 'GET' &&
        r.status() === 200,
      { timeout: 15_000 },
    )
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/playlist/${id}`)
      await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 15_000 })
      await expect(page.getByRole('heading', { name: /walk-through playlist/i })).toBeVisible({
        timeout: 10_000,
      })

      // Open the add-video picker — this triggers the GET /api/videos.
      const addBtn = page.getByRole('button', { name: /add video|add to playlist/i }).first()
      await expect(addBtn).toBeVisible()
      await addBtn.click()
      await videosResponseP

      // Click the first "Add" button in the picker.
      const addRowBtn = page.getByRole('button', { name: /^add$/i }).first()
      await expect(addRowBtn).toBeVisible({ timeout: 10_000 })
      const postP = page.waitForResponse(
        (r) => /\/playlists\/.+\/videos$/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 10_000 },
      )
      await addRowBtn.click()
      const postResp = await postP
      expect(postResp.status()).toBe(201)
    })
    expect(reqs.some((r) => /\/api\/playlists\//.test(r.url) && r.status === 200)).toBe(true)
    expect(reqs.some((r) => /\/api\/videos/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('Share button copies the playlist URL to the clipboard', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'navigator.clipboard requires Chromium permissions')
    await signup(page)
    const created = await authedFetch<{ id?: string; data?: { id?: string } }>(
      page,
      `${API_BASE}/playlists`,
      {
        method: 'POST',
        body: JSON.stringify({ name: 'Share me', is_public: true }),
      },
    )
    const cb = (created.body as { id?: string; data?: { id?: string } } | null) ?? {}
    const id = cb.id ?? cb.data?.id
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(APP_BASE + `/playlist/${id}`)
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15_000 })
    // Wait for the API to hydrate the playlist title.
    await expect(page.getByRole('heading', { name: /share me/i })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /share/i }).first().click()
    const value = await page.evaluate(async () => navigator.clipboard.readText().catch(() => ''))
    expect(value).toContain(`/playlist/${id}`)
  })
})
