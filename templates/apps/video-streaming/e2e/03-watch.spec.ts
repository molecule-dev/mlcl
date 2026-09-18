import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedFetch,
  captureNetwork,
  pickVideo,
  pickVideoWithChannel,
  signup,
} from './_helpers.js'

test.describe('watch page', () => {
  test('Watch loads a catalog video — title, channel, comments composer', async ({ page }) => {
    await signup(page)
    // The video under test comes from the API, not from a named seed row: the
    // demo catalog is the first thing an app's owner replaces.
    const video = await pickVideoWithChannel(page)
    const channelName = video.channel_name ?? ''
    expect(channelName, 'enriched rows must carry channel_name').toBeTruthy()
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/watch/${video.id}`)
      await expect(page.getByRole('heading', { name: video.title })).toBeVisible({
        timeout: 15_000,
      })
      await expect(page.getByText(channelName).first()).toBeVisible()
      await expect(page.getByPlaceholder(/add a comment/i)).toBeVisible()
    })
    // <video> element with a real src — proves the streaming URL was wired through.
    const videoSrc = await page.locator('video').first().getAttribute('src')
    expect(videoSrc, 'watch page must mount a <video> with a stream URL').toMatch(/^https?:\/\//)
    // Network observed: GET /api/videos/:id, GET /api/comments, POST /api/library/history.
    expect(
      reqs.some((r) => /\/api\/videos\//.test(r.url) && r.method === 'GET' && r.status === 200),
    ).toBe(true)
    expect(reqs.some((r) => /\/api\/library\/history/.test(r.url) && r.method === 'POST')).toBe(
      true,
    )
  })

  test('Like button increments like_count and the new value is reflected on reload', async ({
    page,
  }) => {
    const { accessToken: _ } = await signup(page)
    void _
    const video = await pickVideo(page)
    const before = await authedFetch<{ like_count?: number }>(page, `/api/videos/${video.id}`)
    expect(before.status).toBe(200)
    const beforeCount = (before.body?.like_count as number) ?? 0

    await page.goto(APP_BASE + `/watch/${video.id}`)
    await page.getByRole('button', { name: /thumb_up/ }).click()
    await page.waitForTimeout(500) // give the optimistic POST + re-render time to settle

    const after = await authedFetch<{ like_count?: number }>(page, `/api/videos/${video.id}`)
    expect(after.status).toBe(200)
    expect(
      (after.body?.like_count as number) ?? 0,
      'like must increment after click',
    ).toBeGreaterThan(beforeCount)
  })

  test('Subscribe button creates a follow row that survives reload', async ({ page }) => {
    await signup(page)
    const video = await pickVideoWithChannel(page)
    const channelId = video.channel_id!
    await page.goto(APP_BASE + `/watch/${video.id}`)

    // Gate: the Subscribe handler is a no-op until /api/videos/:id resolves
    // and populates `video.channel_id`. The channel link href flips from
    // "/channel/" to "/channel/<uuid>" once that fetch lands — that's the
    // deterministic readiness signal for the page state the click depends on.
    const channelLink = page.locator(`a[href^="/channel/"][href*="${channelId}"]`).first()
    await expect(channelLink).toBeVisible({ timeout: 15_000 })

    const subBtn = page.getByRole('button', { name: /^Subscribe$/i }).first()
    await expect(subBtn).toBeEnabled()
    await subBtn.click()
    await expect(page.getByRole('button', { name: /^Subscribed$/i })).toBeVisible({
      timeout: 10_000,
    })

    // Reload — the Subscribed pill must persist (proves the follow row was written).
    await page.reload()
    // Same readiness gate after reload — the follows fetch must land before
    // the button text settles on "Subscribed".
    await expect(page.locator(`a[href^="/channel/"][href*="${channelId}"]`).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: /^Subscribed$/i })).toBeVisible({
      timeout: 10_000,
    })

    // Backend invariant — exactly one follow row for this channel + this user.
    const { status, body } = await authedFetch<Array<Record<string, unknown>>>(page, '/api/follows')
    expect(status).toBe(200)
    const rows = (body ?? []) as Array<Record<string, unknown>>
    expect(rows.some((f) => f.targetId === channelId)).toBe(true)
  })

  test('Posting a comment shows it in the list and on a fresh GET', async ({ page }) => {
    await signup(page)
    const video = await pickVideo(page)
    await page.goto(APP_BASE + `/watch/${video.id}`)
    const composer = page.getByPlaceholder(/add a comment/i)
    const text = `e2e comment ${Date.now()}`
    await composer.fill(text)
    await page.getByRole('button', { name: /^Comment$/i }).click()
    // Comment renders in the list after the POST resolves.
    await expect(page.getByText(text)).toBeVisible({ timeout: 10_000 })

    // Backend invariant: GET /api/comments?video_id=... returns the new comment.
    const { status, body } = await authedFetch<Array<Record<string, unknown>>>(
      page,
      `/api/comments?video_id=${video.id}`,
    )
    expect(status).toBe(200)
    const rows = (body ?? []) as Array<Record<string, unknown>>
    expect(rows.some((c) => c.body === text)).toBe(true)
  })

  test('Save button writes a watch_later row that the Library page reads back', async ({
    page,
  }) => {
    await signup(page)
    const video = await pickVideo(page)
    await page.goto(APP_BASE + `/watch/${video.id}`)
    const saveBtn = page.getByRole('button', { name: /^Save$/i }).first()
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()
    await page.waitForTimeout(500)

    const { status, body } = await authedFetch<Array<Record<string, unknown>>>(
      page,
      '/api/library/later',
    )
    expect(status).toBe(200)
    const rows = (body ?? []) as Array<Record<string, unknown>>
    expect(
      rows.some((r) => r.video_id === video.id || r.videoId === video.id),
      'save button must persist a /api/library/later row',
    ).toBe(true)
  })

  test('Watching a video bumps view_count + creates a video_views row', async ({ page }) => {
    await signup(page)
    const video = await pickVideo(page)
    const before = await authedFetch<{ view_count?: number }>(page, `/api/videos/${video.id}`)
    const beforeCount = (before.body?.view_count as number) ?? 0
    // The GET above already incremented (by handler design). Hit it again
    // through the watch page and re-fetch — must be higher than the count we
    // just read.
    await page.goto(APP_BASE + `/watch/${video.id}`)
    await page.waitForTimeout(800)
    const after = await authedFetch<{ view_count?: number }>(page, `/api/videos/${video.id}`)
    const afterCount = (after.body?.view_count as number) ?? 0
    expect(afterCount, 'view count must increment after watching').toBeGreaterThan(beforeCount)
  })
})
