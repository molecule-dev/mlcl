import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiCreateFileRow, apiUpload, signup } from './_helpers.js'

// Quick contract checks that run server-side via the page's already-
// authenticated fetch context. These guard against regressions in the
// shape of /api responses that the frontend depends on.

test.describe('API contract', () => {
  test('GET /api/files returns an array (typed JSON, not HTML)', async ({ page }) => {
    await signup(page)
    const json = await page.evaluate(async () => {
      const res = await fetch('/api/files', { credentials: 'include' })
      return { ok: res.ok, type: res.headers.get('content-type') ?? '', body: await res.json() }
    })
    expect(json.ok).toBe(true)
    expect(json.type).toContain('application/json')
    expect(Array.isArray(json.body)).toBe(true)
  })

  test('GET /api/folders returns an array', async ({ page }) => {
    await signup(page)
    const json = await page.evaluate(async () => {
      const res = await fetch('/api/folders', { credentials: 'include' })
      return { ok: res.ok, body: await res.json() }
    })
    expect(json.ok).toBe(true)
    expect(Array.isArray(json.body)).toBe(true)
  })

  test('GET /api/storage returns numeric usedBytes + breakdown', async ({ page }) => {
    await signup(page)
    const json = await page.evaluate(async () => {
      const res = await fetch('/api/storage', { credentials: 'include' })
      return await res.json()
    })
    expect(typeof (json as { usedBytes: unknown }).usedBytes).toBe('number')
    expect((json as { breakdown?: unknown }).breakdown).toBeTruthy()
  })

  test('GET /api/billing/tiers returns at least one tier', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const json = await page.evaluate(async () => {
      const res = await fetch('/api/billing/tiers')
      return await res.json()
    })
    const tiers = (json as { data?: Array<unknown> }).data
    expect(Array.isArray(tiers)).toBe(true)
    expect(tiers!.length).toBeGreaterThan(0)
  })

  test('GET /api/billing/status responds with a planKey for an authed user', async ({ page }) => {
    await signup(page)
    const json = await page.evaluate(async () => {
      const res = await fetch('/api/billing/status', { credentials: 'include' })
      return await res.json()
    })
    expect(typeof (json as { planKey?: unknown }).planKey).toBe('string')
  })

  test('GET /api/files/:id 401s without a session, 200s with', async ({ page }) => {
    await signup(page)
    const upload = await apiUpload(page, 'auth-check.txt', 'authed bytes')
    const file = await apiCreateFileRow(page, {
      name: 'auth-check.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    const apiUrl = `http://localhost:${process.env.API_PORT || '4020'}`
    const anon = await page.request.get(`${apiUrl}/api/files/${file.id}`, {
      headers: { cookie: '' },
    })
    expect([401, 403]).toContain(anon.status())

    const live = await page.evaluate(async (id) => {
      const res = await fetch(`/api/files/${id}`, { credentials: 'include' })
      return res.status
    }, file.id)
    expect(live).toBe(200)
  })
})
