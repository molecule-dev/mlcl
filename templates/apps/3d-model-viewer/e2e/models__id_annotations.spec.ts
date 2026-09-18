import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, signup } from './_helpers.js'

test.describe('/models/:id/annotations (Annotations)', () => {
  test('Annotations page lists existing annotations for the model', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `AnnoPage ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    const ann = await api<{ id: string; title: string }>(page, 'POST', '/annotations', {
      model_id: model.id,
      title: `VisibleAnno-${Date.now()}`,
    })
    await page.goto(`${APP_BASE}/models/${model.id}/annotations`)
    await expect(page.getByText(ann.title).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Toggling resolved persists across reload (read-after-write)', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `AnnoToggle ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    const ann = await api<{ id: string }>(page, 'POST', '/annotations', {
      model_id: model.id,
      title: 'ToggleMe',
    })
    await api(page, 'PUT', `/annotations/${ann.id}`, { resolved: true })
    const list = await api<Array<{ id: string; resolved: boolean }>>(
      page,
      'GET',
      `/annotations?model_id=${model.id}`,
    )
    expect(list.find((a) => a.id === ann.id)?.resolved).toBe(true)
  })

  test('Page renders without console errors', async ({ page }) => {
    await signup(page)
    const model = await api<{ id: string }>(page, 'POST', '/models', {
      name: `AnnoConsole ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 0,
      polygon_count: 0,
    })
    // Attach AFTER the navigation. goto resolves on the new document's 'load',
    // by which point the previous page is gone — but React has not mounted yet,
    // so every error this page raises while hydrating and fetching is still
    // captured. Listening earlier also caught the DYING page: signup lands on
    // /dashboard, whose /api/models fetch is still in flight when this goto
    // destroys it, and the aborted request logs 'dashboard.fetchModels
    // HttpError: Failed to fetch' — an error about a page the test had already
    // left, failing an assertion about the annotations page.
    await page.goto(`${APP_BASE}/models/${model.id}/annotations`)
    const errs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errs.push(msg.text())
    })
    await page.waitForLoadState('networkidle')
    const fatal = errs.filter((e) => !/favicon|net::ERR_/.test(e))
    expect(fatal).toEqual([])
  })
})
