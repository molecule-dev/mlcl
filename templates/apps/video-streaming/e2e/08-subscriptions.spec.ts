import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authedFetch,
  captureNetwork,
  getAccessToken,
  getChannels,
  pickChannelWithVideos,
  signup,
} from './_helpers.js'

test.describe('subscriptions page', () => {
  test('lists videos from a channel the user just followed', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Follow whichever channel the app holds videos for — naming a demo
    // channel breaks the spec the moment its catalog is replaced.
    const { channel, videos } = await pickChannelWithVideos(page)
    const r = await page.request.post(`${API_BASE}/follows`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      data: { channel_id: channel.id },
      failOnStatusCode: false,
    })
    expect(r.status(), await r.text()).toBeLessThan(300)

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/subscriptions')
      // The followed channel's own video must render.
      await expect(page.getByText(videos[0].title).first()).toBeVisible({
        timeout: 15_000,
      })
    })
    // The Subscriptions page hydrates from /api/follows (which then drives
    // the per-channel video previews server-side). The exact `/api/videos`
    // call shape is an implementation detail — we only require that the
    // follows endpoint was hit.
    expect(reqs.some((q) => /\/api\/follows/.test(q.url) && q.status === 200)).toBe(true)
  })

  test('GET /api/follows returns rows after subscribing', async ({ page }) => {
    await signup(page)
    const channels = await getChannels(page)
    const channel = channels[0]
    expect(channel, 'the app must hold at least one channel').toBeTruthy()
    const t = (await getAccessToken(page)) ?? ''
    const postRes = await page.request.post(`${API_BASE}/follows`, {
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      data: { channel_id: channel.id },
      failOnStatusCode: false,
    })
    expect(postRes.status()).toBeLessThan(300)

    const { status, body } = await authedFetch<Array<Record<string, unknown>>>(page, '/api/follows')
    expect(status).toBe(200)
    expect(
      ((body ?? []) as Array<Record<string, unknown>>).some((f) => f.targetId === channel.id),
    ).toBe(true)
  })
})
