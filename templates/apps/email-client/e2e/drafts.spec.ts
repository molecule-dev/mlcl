/**
 * Drafts contract — POST/PUT/DELETE round-trip via the real API plus
 * UI assertions for /drafts so this spec satisfies both the resource
 * contract and the per-page coverage gate.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test('POST /drafts creates a draft visible in GET /drafts', async ({ page }) => {
  const { accessToken } = await signup(page)
  const create = await page.request.post(`${API_BASE}/drafts`, {
    headers: apiHeaders(accessToken),
    data: { to: ['draft@example.com'], subject: 'Draft test', body: 'WIP' },
  })
  expect(create.status(), await create.text()).toBe(201)
  const created = (await create.json()) as { id: string }
  expect(created.id).toBeTruthy()

  const list = await page.request.get(`${API_BASE}/drafts`, { headers: apiHeaders(accessToken) })
  expect(list.status()).toBe(200)
  const body = (await list.json()) as { data?: Array<{ id: string }> } | Array<{ id: string }>
  const arr = Array.isArray(body) ? body : (body.data ?? [])
  expect(arr.find((d) => d.id === created.id)).toBeTruthy()
})

test('PUT /drafts/:id updates fields that GET reflects', async ({ page }) => {
  const { accessToken } = await signup(page)
  const create = await page.request.post(`${API_BASE}/drafts`, {
    headers: apiHeaders(accessToken),
    data: { to: ['draft@example.com'], subject: 'v1', body: 'first' },
  })
  expect(create.status()).toBe(201)
  const draft = (await create.json()) as { id: string }

  const update = await page.request.put(`${API_BASE}/drafts/${draft.id}`, {
    headers: apiHeaders(accessToken),
    data: { subject: 'v2', body: 'second' },
  })
  expect(update.status()).toBe(200)

  const detail = await page.request.get(`${API_BASE}/drafts/${draft.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect(detail.status()).toBe(200)
  const fresh = (await detail.json()) as { subject: string; body: string }
  expect(fresh.subject).toBe('v2')
  expect(fresh.body).toBe('second')
})

test('GET /drafts renders the drafts page after sign-in', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/drafts')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('link', { name: /drafts/i }).first()).toBeVisible()
})

test('GET /drafts fetches /api/drafts on mount', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/drafts')
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.some(
      (r) => /\/api\/(?:drafts|emails\?[^"]*folder=drafts)/.test(r.url) && r.status === 200,
    ),
  ).toBe(true)
})

test('DELETE /drafts/:id removes the draft', async ({ page }) => {
  const { accessToken } = await signup(page)
  const create = await page.request.post(`${API_BASE}/drafts`, {
    headers: apiHeaders(accessToken),
    data: { to: ['draft@example.com'], subject: 'delete me', body: '' },
  })
  expect(create.status()).toBe(201)
  const draft = (await create.json()) as { id: string }

  const del = await page.request.delete(`${API_BASE}/drafts/${draft.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect([200, 204]).toContain(del.status())

  const after = await page.request.get(`${API_BASE}/drafts/${draft.id}`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(after.status()).toBe(404)
})
