import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, createProject, signup } from './_helpers.js'

test.describe('/projects/:id/export (Export)', () => {
  test('renders the Export heading', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}/export`)
    await expect(page.getByRole('heading', { name: /Export/i, level: 1 })).toBeVisible()
  })

  test('CSS Keyframes button switches the format pill', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}/export`)
    await page.locator('[data-mol-id="format-css"]').click()
    await expect(page.locator('[data-mol-id="export-start"]')).toContainText(/CSS/i)
  })

  test('Lottie JSON button switches the format pill', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}/export`)
    await page.locator('[data-mol-id="format-css"]').click()
    await page.locator('[data-mol-id="format-lottie"]').click()
    await expect(page.locator('[data-mol-id="export-start"]')).toContainText(/LOTTIE/i)
  })

  test('Animated SVG button switches the format pill', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}/export`)
    await page.locator('[data-mol-id="format-svg"]').click()
    await expect(page.locator('[data-mol-id="export-start"]')).toContainText(/SVG/i)
  })

  test('Standard quality preset is clickable', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}/export`)
    const btn = page.locator('[data-mol-id="quality-standard"]')
    await btn.click()
    await expect(btn).toHaveClass(/border-\[color-mix\(in_srgb,var\(--anim-primary\)/)
  })

  test('Optimized quality preset is clickable', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}/export`)
    const btn = page.locator('[data-mol-id="quality-optimized"]')
    await btn.click()
    await expect(btn).toHaveClass(/border-\[color-mix\(in_srgb,var\(--anim-primary\)/)
  })

  test('Play preview toggles its label between play and pause', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}/export`)
    const btn = page.locator('[data-mol-id="export-preview-toggle"]')
    await expect(btn).toContainText(/Play preview/i)
    await btn.click()
    await expect(btn).toContainText(/Pause preview/i)
  })

  test('Export click POSTs /api/exports, persists a completed row, and the download URL serves real bytes', async ({
    page,
  }) => {
    await signup(page)
    const id = await createProject(page)
    // Make sure there's at least one layer so the export has content.
    const cookies = await page.context().cookies()
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    await page.request.post(`${API_BASE}/layers`, {
      data: { projectId: id, name: 'l1', type: 'shape' },
      headers: { Cookie: cookieStr },
    })
    await page.goto(APP_BASE + `/projects/${id}/export`)
    // Pick lottie format which is the default.
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="export-start"]').click()
      // Wait for the row to land in /api/exports
      await page.waitForFunction(
        async () => {
          try {
            const r = await fetch(
              `/api/exports?projectId=${encodeURIComponent(window.location.pathname.split('/')[2]!)}`,
              { credentials: 'include' },
            )
            const arr = await r.json()
            return (
              Array.isArray(arr) && arr.some((x: { status?: string }) => x.status === 'completed')
            )
          } catch {
            return false
          }
        },
        { timeout: 15_000 },
      )
    })
    const post = reqs.find((r) => /\/api\/exports(?:\?|$)/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/exports fired').toBeTruthy()
    expect(post!.status).toBeLessThan(300)

    const list = await page.request.get(`${API_BASE}/exports?projectId=${id}`, {
      headers: { Cookie: cookieStr },
    })
    const arr = await list.json()
    const completed = arr.find(
      (e: { status?: string; id?: string; output_url?: string }) => e.status === 'completed',
    )
    expect(completed, 'a completed export row must exist').toBeTruthy()
    expect(completed.output_url, 'completed row must have a download URL').toMatch(
      /\/api\/exports\/.+\/download/,
    )

    // Hit the download URL and confirm we get real bytes (not an empty response).
    const dl = await page.request.get(
      `http://localhost:${process.env.API_PORT || '4050'}${completed.output_url}`,
      { headers: { Cookie: cookieStr } },
    )
    expect(dl.status(), 'download must succeed').toBe(200)
    const text = await dl.text()
    expect(text.length, 'download body must be non-trivial (real artifact)').toBeGreaterThan(50)
    // Parse as JSON to assert it's a real Lottie payload.
    const j = JSON.parse(text)
    expect(j.v, 'Lottie payload must include schema version').toBeTruthy()
    expect(j.layers.length, 'Lottie payload must include the layer we created').toBeGreaterThan(0)
  })
})
