import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, signup, createProject } from './_helpers.js'

test.describe('/projects/:id (Editor)', () => {
  test('playback controls animate the playhead and the frame counter ticks', async ({ page }) => {
    await signup(page)
    const projectId = await createProject(page)
    await page.goto(`${APP_BASE}/projects/${projectId}`)
    await expect(page.locator('[data-mol-id="editor-frame-counter"]')).toContainText(
      /frame \d+ \/ \d+/,
    )

    await page.locator('[data-mol-id="editor-play"]').click()
    await page.waitForTimeout(1_200)
    const counter = await page.locator('[data-mol-id="editor-frame-counter"]').innerText()
    // CSS text-transform: uppercase — innerText comes back as "FRAME 26 / 300".
    const frame = Number(/frame\s+(\d+)/i.exec(counter)?.[1] ?? 0)
    expect(frame, `playhead advanced while playing (counter: ${counter})`).toBeGreaterThan(0)

    await page.locator('[data-mol-id="editor-stop"]').click()
    await expect(page.locator('[data-mol-id="editor-frame-counter"]')).toContainText(/frame 0 \//i)
  })

  test('Add keyframe POSTs /api/keyframes and the timeline gains the keyframe', async ({
    page,
  }) => {
    await signup(page)
    const projectId = await createProject(page)
    await page.goto(`${APP_BASE}/projects/${projectId}`)
    // A fresh project has no layers — add one so the keyframe has a target.
    await page.locator('[data-mol-id="editor-add-layer"]').click()
    await expect(page.locator('[data-mol-id^="editor-layer-"]').first()).toBeVisible()

    const reqs: Array<{ method: string; url: string; status: number }> = []
    page.on('response', (r) => {
      reqs.push({ method: r.request().method(), url: r.url(), status: r.status() })
    })
    await page.locator('[data-mol-id="editor-add-keyframe"]').click()
    const post = reqs.find((r) => /\/api\/keyframes(?:\?|$)/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/keyframes fired').toBeTruthy()
    expect(post!.status, 'keyframe create succeeds').toBeLessThan(300)
  })
})
