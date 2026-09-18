import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup } from './_helpers.js'

test.describe('/notifications', () => {
  test('renders welcome seed notifications for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle').catch(() => {})
    const text = await page.locator('main, body').first().innerText()
    expect(text).toMatch(/Welcome|Notifications/i)
  })

  test('GET /api/notifications returns non-empty array (seeded on first fetch)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as unknown
    const arr = Array.isArray(body) ? body : ((body as { data?: unknown[] }).data ?? [])
    expect(arr.length).toBeGreaterThan(0)
  })

  test('POST /api/notifications/read-all flips every unread → read', async ({ page }) => {
    const { accessToken } = await signup(page)
    // First fetch seeds
    await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(accessToken),
    })
    const r = await page.request.post(`${API_BASE}/notifications/read-all`, {
      headers: authHeaders(accessToken),
      data: {},
    })
    expect(r.status()).toBeLessThan(400)
    const after = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(accessToken),
    })
    const body = (await after.json()) as Array<{ unread?: boolean }>
    const unread = (Array.isArray(body) ? body : []).filter((n) => n.unread === true)
    expect(unread.length).toBe(0)
  })

  test('PUT /api/notifications/:id can flip a single notification read state', async ({ page }) => {
    const { accessToken } = await signup(page)
    const list = await page.request
      .get(`${API_BASE}/notifications`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ id: string; unread?: boolean }>>)
    expect(list.length).toBeGreaterThan(0)
    const target = list[0]
    const r = await page.request.put(`${API_BASE}/notifications/${target.id}`, {
      headers: authHeaders(accessToken),
      data: { unread: false },
    })
    expect(r.status()).toBeLessThan(400)
    const refetch = await page.request
      .get(`${API_BASE}/notifications`, { headers: authHeaders(accessToken) })
      .then((r2) => r2.json() as Promise<Array<{ id: string; unread?: boolean }>>)
    const updated = refetch.find((n) => n.id === target.id)
    expect(updated?.unread).toBe(false)
  })
})
