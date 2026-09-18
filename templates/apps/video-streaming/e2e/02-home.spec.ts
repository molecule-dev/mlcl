import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  type CatalogVideo,
  authedFetch,
  captureNetwork,
  getChannels,
  pickVideo,
  pickVideoWithChannel,
  signup,
} from './_helpers.js'

test.describe('home page', () => {
  test('home renders the catalog with real channel names + durations', async ({ page }) => {
    await signup(page)
    // Read the video under test from the same endpoint /home reads — naming a
    // seeded title breaks the spec the moment the demo catalog is replaced.
    const video = await pickVideoWithChannel(page)
    const channelName = video.channel_name ?? ''
    expect(channelName, 'enriched rows must carry channel_name').toBeTruthy()

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/home')

      // Real titles from the catalog (not placeholders).
      await expect(page.getByText(video.title).first()).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(channelName).first()).toBeVisible()
    })

    // Durations come from `duration_sec` projected as `duration_seconds`, so
    // somewhere on the home grid we should see at least one MM:SS string.
    const grid = page.locator('main')
    await expect(grid).toContainText(/\d+:\d{2}/, { timeout: 10_000 })
    // Network observed: home must hit /api/videos.
    expect(reqs.some((r) => /\/api\/videos(\?|$)/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('home calls /api/videos for its grid', async ({ page }) => {
    await signup(page)
    const reqs: Array<{ url: string; status: number }> = []
    page.on('response', (r) => reqs.push({ url: r.url(), status: r.status() }))
    await page.goto(APP_BASE + '/home')
    await page.waitForLoadState('networkidle')
    const hits = reqs.filter((r) => /\/api\/videos(\?|$)/.test(r.url) && r.status === 200)
    expect(hits.length, 'home should fetch /api/videos at least once').toBeGreaterThan(0)
  })

  test('home video card href points at /watch/:id with a real catalog id', async ({ page }) => {
    await signup(page)
    const video = await pickVideo(page)
    await page.goto(APP_BASE + '/home')
    await expect(page.locator(`a[href="/watch/${video.id}"]`).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('GET /api/videos returns enriched rows with duration_seconds + channel_name', async ({
    page,
  }) => {
    await signup(page)
    const { status, body } = await authedFetch<CatalogVideo[]>(page, '/api/videos?limit=10')
    expect(status).toBe(200)
    const rows = (body ?? []) as CatalogVideo[]
    expect(rows.length, '/api/videos must return the catalog').toBeGreaterThan(0)

    // Enrichment: channel_name is joined from the channel the video belongs to,
    // and duration_seconds projects the row's duration_sec.
    const row = rows.find((v) => !!v.channel_id)
    expect(row, '/api/videos must return a channel-owned video').toBeTruthy()
    const channels = await getChannels(page)
    const channel = channels.find((c) => c.id === row!.channel_id)
    expect(channel, 'the video must belong to a channel /api/channels lists').toBeTruthy()
    expect(row!.channel_name).toBe(channel!.name)
    expect(typeof row!.duration_seconds).toBe('number')
    expect(row!.duration_seconds).toBe(row!.duration_sec ?? 0)
  })
})
