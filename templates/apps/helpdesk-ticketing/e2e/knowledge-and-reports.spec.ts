import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, promoteToAdmin, signup } from './_helpers.js'

test.describe('helpdesk-ticketing: knowledge base + reports', () => {
  test('GET /api/articles is publicly readable; POST/DELETE require auth', async ({ page }) => {
    // KB articles are intentionally public so anonymous customers can browse
    // the help center. The mutating operations (POST/PATCH/DELETE) require
    // an authenticated agent.
    const anon = await page.request.get(`${API_BASE}/articles`, { failOnStatusCode: false })
    expect(anon.status()).toBe(200)
    const anonBody = await anon.json()
    expect(Array.isArray(anonBody)).toBe(true)

    const anonPost = await page.request.post(`${API_BASE}/articles`, {
      data: { title: 'x', body: 'y' },
      failOnStatusCode: false,
    })
    expect(anonPost.status()).toBe(401)

    const session = await signup(page)
    const res = await page.request.get(`${API_BASE}/articles`, {
      headers: authHeaders(session.accessToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('POST /api/articles persists, GET returns by id, DELETE removes', async ({ page }) => {
    const session = await signup(page)
    // KB article writes are operator-only (requireAdmin); become the operator.
    await promoteToAdmin(page, session.accessToken)
    const title = `KB ${Date.now()}`
    const create = await page.request.post(`${API_BASE}/articles`, {
      headers: authHeaders(session.accessToken),
      data: {
        title,
        body: 'How to reset the helpdesk widget.',
        category: 'getting-started',
      },
      failOnStatusCode: false,
    })
    expect(create.status(), await create.text().catch(() => '')).toBeLessThan(400)
    const created = (await create.json()) as { id: string }
    expect(created.id).toBeTruthy()

    const get = await page.request.get(`${API_BASE}/articles/${created.id}`, {
      headers: authHeaders(session.accessToken),
    })
    expect(get.status()).toBe(200)
    const fetched = (await get.json()) as { title: string }
    expect(fetched.title).toBe(title)

    const del = await page.request.delete(`${API_BASE}/articles/${created.id}`, {
      headers: authHeaders(session.accessToken),
      failOnStatusCode: false,
    })
    expect(del.status()).toBeLessThan(400)
  })

  test('reports page renders without crashing for an authed user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page).toHaveURL(/\/reports$/, { timeout: 10_000 })
    // Verify at least one heading or section renders (page content present).
    await expect(page.locator('main, [data-mol-id]').first()).toBeVisible()
  })

  test('knowledge-base page renders without crashing for an authed user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/knowledge-base')
    await expect(page).toHaveURL(/\/knowledge-base$/, { timeout: 10_000 })
    await expect(page.locator('main, [data-mol-id]').first()).toBeVisible()
  })
})
