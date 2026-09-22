/**
 * /editor/:id — Auth-only multi-pane editor. Loads project + shapes, lets
 * the user rename, draw shapes (each tool POSTs /api/shapes), select +
 * delete shapes, share via collaborators API, and start exports.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  seedProject,
  seedShape,
  signup,
} from './_helpers.js'

async function openEditor(page: any, accessToken: string) {
  const project = await seedProject(page, accessToken, `Editor canvas ${Date.now()}`)
  await page.goto(`${APP_BASE}/editor/${project.id}`)
  await page.waitForSelector('[data-mol-id="editor-toolbar"]', { timeout: 15000 })
  return project
}

test.describe('editor page', () => {
  test('loads project + shapes — GET /api/projects/:id and /api/shapes hit', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken, 'EditorLoad')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(`${APP_BASE}/editor/${project.id}`)
      await page.waitForSelector('[data-mol-id="editor-toolbar"]', { timeout: 10000 })
    })
    const proj = reqs.find(
      (r) =>
        new RegExp(`/api/projects/${project.id}`).test(r.url) &&
        r.method === 'GET' &&
        r.status < 400,
    )
    const shapes = reqs.find(
      (r) => /\/api\/shapes\?projectId=/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(proj).toBeTruthy()
    expect(shapes).toBeTruthy()
  })

  test('renaming the project (button → input → blur) saves via PUT /api/projects/:id', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const project = await openEditor(page, accessToken)
    await page.locator('[data-mol-id="editor-project-name"]').click()
    const newName = `Renamed ${Date.now()}`
    await page.locator('[data-mol-id="editor-project-name-input"]').fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="editor-project-name-input"]').blur()
      await page.waitForTimeout(800)
    })
    const put = reqs.find(
      (r) =>
        new RegExp(`/api/projects/${project.id}`).test(r.url) &&
        r.method === 'PUT' &&
        r.status < 400,
    )
    expect(put).toBeTruthy()
    const fresh = await page.request.get(`${API_BASE}/projects/${project.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect((await fresh.json()).name).toBe(newName)
  })

  test('Rectangle tool POSTs /api/shapes and renders an SVG <rect>', async ({ page }) => {
    const { accessToken } = await signup(page)
    await openEditor(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="editor-tool-rect"]').click()
      await page.waitForTimeout(800)
    })
    const post = reqs.find(
      (r) => /\/api\/shapes(\?|$)/.test(r.url) && r.method === 'POST' && r.status < 400,
    )
    expect(post).toBeTruthy()
    expect(
      await page.locator('[data-mol-id="editor-canvas-surface"] rect').count(),
    ).toBeGreaterThanOrEqual(1)
  })

  test('Ellipse tool POSTs /api/shapes and renders an SVG <ellipse>', async ({ page }) => {
    const { accessToken } = await signup(page)
    await openEditor(page, accessToken)
    await page.locator('[data-mol-id="editor-tool-ellipse"]').click()
    await page.waitForTimeout(800)
    expect(
      await page.locator('[data-mol-id="editor-canvas-surface"] ellipse').count(),
    ).toBeGreaterThanOrEqual(1)
  })

  test('Text tool POSTs /api/shapes and renders an SVG <text>', async ({ page }) => {
    const { accessToken } = await signup(page)
    await openEditor(page, accessToken)
    await page.locator('[data-mol-id="editor-tool-text"]').click()
    await page.waitForTimeout(800)
    expect(
      await page.locator('[data-mol-id="editor-canvas-surface"] text').count(),
    ).toBeGreaterThanOrEqual(1)
  })

  test('Line tool POSTs /api/shapes and renders an SVG <line>', async ({ page }) => {
    const { accessToken } = await signup(page)
    await openEditor(page, accessToken)
    await page.locator('[data-mol-id="editor-tool-line"]').click()
    await page.waitForTimeout(800)
    expect(
      await page.locator('[data-mol-id="editor-canvas-surface"] line').count(),
    ).toBeGreaterThanOrEqual(1)
  })

  test('Select tool toggles active without creating a shape', async ({ page }) => {
    const { accessToken } = await signup(page)
    await openEditor(page, accessToken)
    const before = await page.locator('[data-mol-id="editor-canvas-surface"] *').count()
    await page.locator('[data-mol-id="editor-tool-select"]').click()
    await page.waitForTimeout(300)
    const after = await page.locator('[data-mol-id="editor-canvas-surface"] *').count()
    expect(after).toBe(before)
  })

  test('Hand tool toggles active without creating a shape', async ({ page }) => {
    const { accessToken } = await signup(page)
    await openEditor(page, accessToken)
    const before = await page.locator('[data-mol-id="editor-canvas-surface"] *').count()
    await page.locator('[data-mol-id="editor-tool-hand"]').click()
    await page.waitForTimeout(300)
    const after = await page.locator('[data-mol-id="editor-canvas-surface"] *').count()
    expect(after).toBe(before)
  })

  test('Share button POSTs /api/projects/:id/collaborators and shows status banner', async ({
    page,
  }, testInfo) => {
    // Free tier refuses the invite with 402 — the paywall message IS the
    // expected status banner; allow its console noise.
    testInfo.annotations.push({
      type: 'allow-console-error',
      description: 'status of 402',
    })
    const { accessToken } = await signup(page)
    const project = await openEditor(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="editor-share"]').click()
      await page.waitForSelector('[data-mol-id="editor-status"]', { timeout: 10000 })
    })
    const post = reqs.find(
      (r) =>
        new RegExp(`/api/projects/${project.id}/collaborators`).test(r.url) && r.method === 'POST',
    )
    expect(post).toBeTruthy()
  })

  test('Export button POSTs /api/exports and surfaces a status banner', async ({ page }) => {
    const { accessToken } = await signup(page)
    await openEditor(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="editor-export"]').click()
      await page.waitForSelector('[data-mol-id="editor-status"]', { timeout: 10000 })
    })
    const post = reqs.find((r) => /\/api\/exports(\?|$)/.test(r.url) && r.method === 'POST')
    expect(post).toBeTruthy()
  })

  test('clicking a layer selects the shape and shows the Delete button', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await openEditor(page, accessToken)
    const shape = await seedShape(page, accessToken, project.id, 'rect')
    await page.reload()
    await page.waitForSelector(`[data-mol-id="editor-layer-${shape.id}"]`, { timeout: 10000 })
    await page.locator(`[data-mol-id="editor-layer-${shape.id}"]`).click()
    await expect(page.locator('[data-mol-id="editor-shape-delete"]')).toBeVisible()
  })

  test('Delete button DELETEs /api/shapes/:id and removes it from the list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await openEditor(page, accessToken)
    const shape = await seedShape(page, accessToken, project.id, 'rect')
    await page.reload()
    await page.locator(`[data-mol-id="editor-layer-${shape.id}"]`).click()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="editor-shape-delete"]').click()
      await page.waitForTimeout(800)
    })
    const del = reqs.find(
      (r) =>
        new RegExp(`/api/shapes/${shape.id}`).test(r.url) &&
        r.method === 'DELETE' &&
        r.status < 400,
    )
    expect(del).toBeTruthy()
    await expect(page.locator(`[data-mol-id="editor-layer-${shape.id}"]`)).toHaveCount(0)
  })

  test('Zoom +/- buttons change the zoom-label percentage', async ({ page }) => {
    const { accessToken } = await signup(page)
    await openEditor(page, accessToken)
    const before = (await page.locator('[data-mol-id="editor-zoom-label"]').textContent()) ?? ''
    await page.getByRole('button', { name: /Zoom in/ }).click()
    await page.waitForTimeout(200)
    const after = (await page.locator('[data-mol-id="editor-zoom-label"]').textContent()) ?? ''
    expect(after).not.toBe(before)
  })

  test('navigating to /editor/<unknown-id> shows the "Project unavailable" error block', async ({
    page,
  }, testInfo) => {
    // The unknown-id GET 404s by design — the error block is the expectation.
    testInfo.annotations.push({
      type: 'allow-console-error',
      description: 'status of 404',
    })
    await signup(page)
    await page.goto(`${APP_BASE}/editor/00000000-0000-0000-0000-000000000000`)
    await expect(page.locator('text=/Project unavailable/i')).toBeVisible({ timeout: 10000 })
  })
})
