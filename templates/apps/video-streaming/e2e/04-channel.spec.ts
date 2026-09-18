import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedFetch,
  captureNetwork,
  getChannels,
  pickChannelWithVideos,
  signup,
} from './_helpers.js'

test.describe('channel page', () => {
  test('renders the channel header from /api/channels/:id', async ({ page }) => {
    await signup(page)
    // The channel under test comes from /api/channels — the same list the app
    // reads — so the spec survives the demo channels being replaced.
    const channels = await getChannels(page)
    const channel = channels[0]
    expect(channel, 'the app must hold at least one channel').toBeTruthy()
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/channel/${channel.id}`)
      await expect(page.getByRole('heading', { name: channel.name })).toBeVisible({
        timeout: 15_000,
      })
      if (channel.handle) {
        await expect(page.getByText(`@${channel.handle}`).first()).toBeVisible()
      }
    })
    expect(reqs.some((r) => /\/api\/channels\//.test(r.url) && r.status === 200)).toBe(true)
    expect(reqs.some((r) => /\/api\/videos/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('lists the channel videos via /api/videos?channel_id=', async ({ page }) => {
    await signup(page)
    // A channel that owns at least two videos, read from the API — the page
    // must list every one of them.
    const { channel, videos } = await pickChannelWithVideos(page, 2)
    await page.goto(APP_BASE + `/channel/${channel.id}`)
    await expect(page.getByText(videos[0].title).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(videos[1].title).first()).toBeVisible()
  })

  test('Subscribe → Unsubscribe round-trips through /api/follows', async ({ page }) => {
    await signup(page)
    const { channel } = await pickChannelWithVideos(page)
    await page.goto(APP_BASE + `/channel/${channel.id}`)

    const sub = page.getByRole('button', { name: /^Subscribe$/i }).first()
    await sub.click()
    await expect(page.getByRole('button', { name: /^Subscribed$/i })).toBeVisible({ timeout: 5000 })

    let r = await authedFetch<Array<Record<string, unknown>>>(page, '/api/follows')
    expect(
      ((r.body ?? []) as Array<Record<string, unknown>>).some((f) => f.targetId === channel.id),
    ).toBe(true)

    await page.getByRole('button', { name: /^Subscribed$/i }).click()
    await expect(page.getByRole('button', { name: /^Subscribe$/i })).toBeVisible({ timeout: 5000 })

    r = await authedFetch<Array<Record<string, unknown>>>(page, '/api/follows')
    expect(
      ((r.body ?? []) as Array<Record<string, unknown>>).some((f) => f.targetId === channel.id),
    ).toBe(false)
  })
})
