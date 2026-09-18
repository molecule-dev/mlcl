import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getFirstImageId, signup } from './_helpers.js'

test.describe('/images/:id', () => {
  test('renders Image h1 and fetches the generation', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/images/${id}`)
      await expect(page.getByRole('heading', { name: /^Image$/i, level: 1 })).toBeVisible()
    })
    expect(reqs.some((r) => /\/api\/generations/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('top-bar "Open in editor" goes to /editor/:id', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    await page.goto(APP_BASE + `/images/${id}`)
    await page.getByRole('link', { name: /Open in editor/i }).click()
    await expect(page).toHaveURL(/\/editor\//)
  })

  test('"Download" button triggers a real browser download', async ({ page }) => {
    await signup(page)

    // Use the generator so the row genuinely has an image_url. Many seed rows
    // are status=queued/failed and would never produce a download.
    await page.goto(APP_BASE + '/generate')
    await page.getByPlaceholder(/dreamscape/i).fill('test download artifact')
    const generationsPost = page.waitForResponse(
      (r) => /\/api\/generations(?:\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 60_000 },
    )
    await page
      .getByRole('button', { name: /^auto_awesome Generate$|^Generate$/i })
      .first()
      .click()
    const resp = await generationsPost
    const created = (await resp.json()) as { id: string; image_url: string }

    expect(created.image_url, 'precondition: generated row must carry image_url').toBeTruthy()
    await page.goto(APP_BASE + `/images/${created.id}`)

    const btn = page.getByRole('button', { name: /\bDownload$/i })
    await expect(btn).toBeEnabled()
    const downloadEvent = page.waitForEvent('download', { timeout: 10_000 })
    await btn.click()
    const download = await downloadEvent
    expect(download.suggestedFilename(), 'download must include a sensible filename').toMatch(
      /\.(png|jpe?g|webp)$/i,
    )
  })

  test('"Upscale 4×" produces a child variation row', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    await page.goto(APP_BASE + `/images/${id}`)
    const variationResp = page.waitForResponse(
      (r) =>
        /\/api\/generations\/[^/]+\/variations/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 90_000 },
    )
    await page.getByRole('button', { name: /Upscale/i }).click()
    const resp = await variationResp
    // Either the upstream provider produced a variation (201 + image_url) or it
    // failed (502 + error). Both prove the action invoked the real provider —
    // never a placeholder. A user-facing failure is still a real outcome.
    // POST /:id/variations is a BATCH endpoint — it can be asked for several
    // variations at once, so it answers `{ variations: [row, …] }`. This read
    // the fields off the top level, where they have never existed, and failed
    // on `image_url: undefined` for a response that was actually correct.
    const body = (await resp.json()) as {
      variations?: Array<{ id?: string; image_url?: string | null; parent_id?: string }>
      error?: string
    }
    expect([201, 502]).toContain(resp.status())
    if (resp.status() === 201) {
      const first = body.variations?.[0]
      expect(first, 'a 201 must return at least one variation row').toBeTruthy()
      expect(first?.image_url, 'successful upscale must carry image_url').toBeTruthy()
      expect(first?.parent_id, 'upscale row must reference the parent').toBe(id)
    } else {
      expect(body.error, 'failed upscale must surface a real provider error').toBeTruthy()
    }
  })

  test('action toolbar "Open editor" link goes to /editor/:id', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    await page.goto(APP_BASE + `/images/${id}`)
    // "Open editor" is rendered as a Link in the action toolbar (with an "edit"
    // glyph as part of its accessible name); the topbar exposes a separate
    // "Open in editor" link. Match the action-toolbar one explicitly.
    await page.getByRole('link', { name: /\bOpen editor$/i }).click()
    await expect(page).toHaveURL(/\/editor\//)
  })

  test('"Variations" produces a child variation row', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    await page.goto(APP_BASE + `/images/${id}`)
    const variationResp = page.waitForResponse(
      (r) =>
        /\/api\/generations\/[^/]+\/variations/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 90_000 },
    )
    await page.getByRole('button', { name: /\bVariations$/i }).click()
    const resp = await variationResp
    // Same batch shape as the upscale case above: `{ variations: [row, …] }`.
    const body = (await resp.json()) as {
      variations?: Array<{ id?: string; image_url?: string | null; parent_id?: string }>
      error?: string
    }
    expect([201, 502]).toContain(resp.status())
    if (resp.status() === 201) {
      const first = body.variations?.[0]
      expect(first, 'a 201 must return at least one variation row').toBeTruthy()
      expect(first?.image_url).toBeTruthy()
      expect(first?.parent_id).toBe(id)
    } else {
      expect(body.error).toBeTruthy()
    }
  })

  test('"Share" PUTs /api/gallery/:id/visibility (toggle public)', async ({ page }) => {
    await signup(page)
    const id = await getFirstImageId(page)
    await page.goto(APP_BASE + `/images/${id}`)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /\bShare$/i }).click()
      await page.waitForTimeout(2000)
    })
    expect(
      reqs.some(
        (r) =>
          /\/api\/gallery\/[^/]+\/visibility/.test(r.url) &&
          (r.method === 'PUT' || r.method === 'POST'),
      ),
    ).toBeTruthy()
  })
})
