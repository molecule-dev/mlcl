import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedFetch, captureNetwork, pickVideo, signup } from './_helpers.js'

test.describe('library page', () => {
  test('shows watch history populated by visits to /watch/:id', async ({ page }) => {
    await signup(page)
    // The video under test is read from the catalog rather than named, so the
    // spec keeps working once the demo videos are replaced.
    const video = await pickVideo(page)
    // Watching a video creates a video_views row → shows up in /api/library/history.
    await page.goto(APP_BASE + `/watch/${video.id}`)
    await page.waitForTimeout(800)

    const { status, body } = await authedFetch<Array<Record<string, unknown>>>(
      page,
      '/api/library/history',
    )
    expect(status).toBe(200)
    const rows = (body ?? []) as Array<Record<string, unknown>>
    expect(
      rows.some((r) => r.video_id === video.id || r.videoId === video.id),
      'history must include the video we just watched',
    ).toBe(true)

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/library')
      await expect(page.getByText(video.title).first()).toBeVisible({
        timeout: 15_000,
      })
    })
    expect(reqs.some((r) => /\/api\/library\/history/.test(r.url) && r.status === 200)).toBe(true)
    expect(reqs.some((r) => /\/api\/library\/later/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('shows watch later items added via Save', async ({ page }) => {
    await signup(page)
    const video = await pickVideo(page)
    // Save a video, then visit /library and confirm it renders.
    await page.goto(APP_BASE + `/watch/${video.id}`)
    await page
      .getByRole('button', { name: /^Save$/i })
      .first()
      .click()
    await page.waitForTimeout(500)

    await page.goto(APP_BASE + '/library')
    await expect(page.getByText(video.title).first()).toBeVisible({
      timeout: 15_000,
    })
  })
})
