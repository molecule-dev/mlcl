import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authedFetch,
  captureNetwork,
  pickChannelWithVideos,
  pickVideo,
  signup,
} from './_helpers.js'

/**
 * Cross-page kitchen-sink journey.
 *
 * A single signed-up user visits ALL the primary screens in one session,
 * using the live API. The point is to catch problems where an isolated
 * page works in its own spec but breaks when navigated to via the
 * sidebar / from another page (auth-token drift, stale data, lazy-load
 * failures, etc.).
 *
 * Every assertion verifies a USER-FACING outcome (text rendered, URL
 * settled, network call succeeded), never just a click.
 */

test('Full user journey across every primary page', async ({ page }) => {
  test.setTimeout(180_000)

  // ---- 1. Signup ----------------------------------------------------------
  const session = await signup(page)
  expect(session.userId).toBeTruthy()
  expect(session.accessToken).toBeTruthy()

  // The channel and video this journey drives are read from the API rather
  // than named, so it still passes once the demo catalog is replaced.
  const { channel } = await pickChannelWithVideos(page)
  const video = await pickVideo(page)

  // ---- 2. /home — videos load from the API (not the sample fallback) ------
  {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/home')
      await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 15_000 })
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.some((r) => /\/api\/videos(?:\?|$)/.test(r.url) && r.status === 200),
      'home should successfully GET /api/videos',
    ).toBe(true)
    // Heading present.
    await expect(page.getByRole('heading').first()).toBeVisible()
  }

  // ---- 3. /trending -------------------------------------------------------
  await page.goto(APP_BASE + '/trending')
  await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 })

  // ---- 4. /subscriptions --------------------------------------------------
  {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/subscriptions')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/(subscriptions|channels)/.test(r.url))).toBe(true)
  }

  // ---- 5. /search?q=film --------------------------------------------------
  {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/search?q=film')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/(search|videos)/.test(r.url))).toBe(true)
  }

  // ---- 6. /channel/:id ----------------------------------------------------
  await page.goto(APP_BASE + `/channel/${channel.id}`)
  await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 })

  // ---- 7. /watch/:id — must record watch_history --------------------------
  {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/watch/${video.id}`)
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.some((r) => /\/api\/library\/history$/.test(r.url) && r.method === 'POST'),
      'opening /watch/:id MUST POST to /api/library/history',
    ).toBe(true)
  }

  // ---- 8. /library — should show the just-watched video in History --------
  {
    await page.goto(APP_BASE + '/library')
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 })
    const r = await authedFetch<unknown>(page, `${API_BASE}/library/history`)
    expect(r.status).toBe(200)
    const body = r.body
    const items: Array<{ video_id?: string }> = Array.isArray(body)
      ? (body as Array<{ video_id?: string }>)
      : ((
          body as {
            data?: Array<{ video_id?: string }>
            props?: Array<{ video_id?: string }>
          } | null
        )?.data ??
        (
          body as {
            data?: Array<{ video_id?: string }>
            props?: Array<{ video_id?: string }>
          } | null
        )?.props ??
        [])
    expect(
      items.some((i) => i.video_id === video.id),
      'history must contain the video we just watched',
    ).toBe(true)
  }

  // ---- 9. /upload — wizard renders ----------------------------------------
  await page.goto(APP_BASE + '/upload')
  await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 })
  await expect(
    page.getByText(/drag a file here|click to choose|choose a file/i).first(),
  ).toBeVisible()

  // ---- 10. /studio --------------------------------------------------------
  await page.goto(APP_BASE + '/studio')
  await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('link', { name: /upload video/i })).toBeVisible()

  // ---- 11. /notifications -------------------------------------------------
  await page.goto(APP_BASE + '/notifications')
  await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 })

  // ---- 12. Create + view a playlist via /playlist/:id --------------------
  const created = await authedFetch<{ id?: string; data?: { id?: string } }>(
    page,
    `${API_BASE}/playlists`,
    {
      method: 'POST',
      body: JSON.stringify({ name: 'Journey playlist', is_public: true }),
    },
  )
  expect(created.status).toBe(201)
  const cb = (created.body as { id?: string; data?: { id?: string } } | null) ?? {}
  const playlistId = cb.id ?? cb.data?.id
  expect(playlistId).toBeTruthy()
  await authedFetch(page, `${API_BASE}/playlists/${playlistId}/videos`, {
    method: 'POST',
    body: JSON.stringify({ video_id: video.id }),
  })
  await page.goto(APP_BASE + `/playlist/${playlistId}`)
  await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: /journey playlist/i })).toBeVisible({
    timeout: 10_000,
  })

  // ---- 13. /settings — toggle persists ------------------------------------
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 })
  const sw = page.getByRole('switch').first()
  if ((await sw.count()) > 0) {
    const before = await sw.getAttribute('aria-checked')
    // Prefs persist through the server-side /api/preferences channel
    // (users.oauthData is stripped from user-resource reads).
    const patched = page.waitForResponse(
      (r) =>
        /\/api\/preferences\/?$/.test(r.url()) &&
        r.request().method() === 'PATCH' &&
        r.status() === 200,
      { timeout: 10_000 },
    )
    await sw.click()
    await patched
    const after = await sw.getAttribute('aria-checked')
    expect(after).not.toBe(before)
  }

  // ---- 14. /pricing — public page (no auth required) ----------------------
  await page.goto(APP_BASE + '/pricing')
  await expect(page.locator('[data-mol-id="pricing-page"]')).toBeVisible({ timeout: 15_000 })

  // ---- 15. /plan-updated mounts ------------------------------------------
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 10_000 })
})
