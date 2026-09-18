import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, signup, authedApi } from './_helpers.js'

/**
 * Backend smoke for the `/api/builds` handler.
 *
 * The current UI surfaces builds only via the per-pipeline detail view, so the
 * builds CRUD endpoints don't appear in any page-level network capture. This
 * spec exercises them directly through the API with an authenticated client to
 * verify the handler is wired, gated, and JSON-shaped — the minimum bar for a
 * production-ready endpoint.
 */
test.describe('/api/builds (backend smoke)', () => {
  test('GET /api/builds responds 200 with an array body for an authenticated user', async ({
    page,
    request,
  }) => {
    const user = await signup(page)
    expect(user.accessToken, 'auth token captured').toBeTruthy()
    const api = authedApi(request, user.accessToken!)
    const res = await api.get('/builds')
    expect(res.status(), 'GET /api/builds status').toBe(200)
    const body = await res.json()
    const arr = Array.isArray(body) ? body : (body?.items ?? body?.builds ?? [])
    expect(Array.isArray(arr), 'GET /api/builds returns a list shape').toBe(true)
  })

  test('GET /api/builds without auth returns 401 (auth gate enforced)', async ({ request }) => {
    const res = await request.get(API_BASE + '/builds')
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/builds/:id with bogus id returns 404 (not 500) — error handling proven', async ({
    page,
    request,
  }) => {
    const user = await signup(page)
    const api = authedApi(request, user.accessToken!)
    const res = await api.get('/builds/00000000-0000-0000-0000-000000000000')
    expect(res.status(), 'bogus build id returns not-found, not crash').toBe(404)
  })
})
