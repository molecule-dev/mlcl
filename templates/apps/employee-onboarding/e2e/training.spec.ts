/**
 * Training module read-after-write — Start a module, mark complete, both
 * persist on re-read and propagate to /api/training-progress.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('training', () => {
  test('starting a module creates a training_progress row with started_at', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tr-start'))
    const modulesRes = await page.request.get(`${API_BASE}/training-modules`, {
      headers: authHeaders(accessToken),
    })
    const modules = (await modulesRes.json()) as Array<{ id: string; title: string }>
    expect(modules.length).toBeGreaterThan(0)
    const module = modules[0]

    const post = await page.request.post(`${API_BASE}/training-progress`, {
      headers: authHeaders(accessToken),
      data: { module_id: module.id, started_at: new Date().toISOString() },
    })
    expect(post.status()).toBe(201)
    const created = (await post.json()) as {
      id: string
      module_id: string
      started_at: string | null
    }
    expect(created.module_id).toBe(module.id)
    expect(created.started_at).toBeTruthy()

    const getList = await page.request.get(`${API_BASE}/training-progress?module_id=${module.id}`, {
      headers: authHeaders(accessToken),
    })
    const list = (await getList.json()) as Array<{ id: string; started_at: string | null }>
    expect(list.length).toBeGreaterThan(0)
    expect(list[0].started_at).toBeTruthy()
  })

  test('completing a module sets completed_at and quiz_score', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tr-complete'))
    const modulesRes = await page.request.get(`${API_BASE}/training-modules`, {
      headers: authHeaders(accessToken),
    })
    const modules = (await modulesRes.json()) as Array<{ id: string }>
    const module = modules[0]

    const post = await page.request.post(`${API_BASE}/training-progress`, {
      headers: authHeaders(accessToken),
      data: { module_id: module.id, started_at: new Date().toISOString() },
    })
    const created = (await post.json()) as { id: string }

    const put = await page.request.put(`${API_BASE}/training-progress/${created.id}`, {
      headers: authHeaders(accessToken),
      data: { completed_at: new Date().toISOString(), quiz_score: 92 },
    })
    expect(put.status()).toBe(200)
    const reread = await page.request.get(`${API_BASE}/training-progress/${created.id}`, {
      headers: authHeaders(accessToken),
    })
    const after = (await reread.json()) as {
      completed_at: string | null
      quiz_score: number | null
    }
    expect(after.completed_at).toBeTruthy()
    expect(after.quiz_score).toBe(92)
  })

  test('Training page renders modules from the API and fans out to /modules + /progress', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('tr-ui'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/training')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-training"]').first()).toBeVisible()
    await expect(page.locator('[data-mol-id^="training-card-"]').first()).toBeVisible({
      timeout: 10000,
    })
    expect(
      reqs.some((r) => /\/api\/training-modules(\b|\?)/.test(r.url) && r.method === 'GET'),
    ).toBe(true)
    expect(
      reqs.some((r) => /\/api\/training-progress(\b|\?)/.test(r.url) && r.method === 'GET'),
    ).toBe(true)
  })
})
