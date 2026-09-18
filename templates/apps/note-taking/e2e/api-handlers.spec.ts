/**
 * Direct API-handler exercise spec — covers handlers whose UI affordance
 * is indirect (creating a database/template, completing a password reset)
 * by hitting the endpoints directly with a real signed-up user's JWT.
 *
 * Outcomes asserted: read-after-write (POST then GET round-trips), error
 * shape on invalid input, error shape on unauthenticated requests.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, signup } from './_helpers.js'

test('GET /api/databases returns 401 unauthenticated', async ({ request }) => {
  const r = await request.get(API_BASE + '/databases')
  expect([401, 403]).toContain(r.status())
})

async function ensureWorkspace(
  request: import('@playwright/test').APIRequestContext,
): Promise<{ id: string }> {
  const apiBase = API_BASE
  const list = await request.get(apiBase + '/workspaces')
  const listBody = await list.text()
  if (list.status() !== 200) {
    throw new Error(`GET /workspaces ${list.status()} ${listBody.slice(0, 200)}`)
  }
  const items = JSON.parse(listBody)
  if (Array.isArray(items) && items.length > 0) return items[0]
  const created = await request.post(apiBase + '/workspaces', {
    data: { name: 'API Test notebook' },
  })
  const body = await created.text()
  if (created.status() >= 300) {
    throw new Error(`POST /workspaces ${created.status()} ${body.slice(0, 200)}`)
  }
  return JSON.parse(body)
}

test('POST → GET round-trip on /api/databases creates and lists a database', async ({ page }) => {
  await signup(page)

  const apiBase = API_BASE
  const ws = await ensureWorkspace(page.request)
  expect(ws?.id).toMatch(/[0-9a-f-]{36}/)

  const pageRes = await page.request.post(apiBase + '/pages', {
    data: { workspace_id: ws.id, title: 'Page for DB' },
  })
  expect(pageRes.status()).toBeGreaterThanOrEqual(200)
  expect(pageRes.status()).toBeLessThan(300)
  const page0 = await pageRes.json()

  const created = await page.request.post(apiBase + '/databases', {
    data: { workspace_id: ws.id, page_id: page0.id, name: 'My DB' },
  })
  expect(created.status(), `POST /api/databases body: ${await created.text()}`).toBeLessThan(300)
  const db = await created.json()
  expect(db?.name).toBe('My DB')

  const listed = await page.request.get(apiBase + '/databases?workspace_id=' + ws.id)
  expect(listed.status()).toBe(200)
  const items = await listed.json()
  expect(Array.isArray(items) ? items.some((d: { id: string }) => d.id === db.id) : false).toBe(
    true,
  )
})

test('POST → GET round-trip on /api/templates creates and lists a template', async ({ page }) => {
  await signup(page)
  const apiBase = API_BASE

  const ws = await ensureWorkspace(page.request)
  expect(ws?.id).toMatch(/[0-9a-f-]{36}/)

  const created = await page.request.post(apiBase + '/templates', {
    data: { workspace_id: ws.id, name: 'Standup note', body: { blocks: [] } },
  })
  expect(created.status(), `POST /api/templates body: ${await created.text()}`).toBeLessThan(300)
  const tpl = await created.json()
  expect(tpl?.name).toBe('Standup note')

  const listed = await page.request.get(apiBase + '/templates?workspace_id=' + ws.id)
  expect(listed.status()).toBe(200)
  const items = await listed.json()
  expect(Array.isArray(items) ? items.some((t: { id: string }) => t.id === tpl.id) : false).toBe(
    true,
  )
})

test('POST /api/users/reset-password rejects unknown tokens with 4xx', async ({ request }) => {
  const apiBase = API_BASE
  const r = await request.post(apiBase + '/users/reset-password', {
    data: { email: 'unknown@example.com', token: 'never-issued', password: 'NewSecret123!' },
  })
  expect(r.status()).toBeGreaterThanOrEqual(400)
})

test('POST /api/users/forgot-password followed by POST /api/users/reset-password returns 4xx for stale token', async ({
  request,
}) => {
  const apiBase = API_BASE
  const email = `reset-test-${Date.now()}@example.com`
  // Create user.
  const signupRes = await request.post(apiBase + '/users', {
    data: { email, password: 'TestPass123!', name: 'Reset Tester' },
  })
  expect([200, 201]).toContain(signupRes.status())

  // Request forgot-password — the token is delivered out-of-band via Mailgun
  // so we don't have it. Subsequent POST with a wrong token must 4xx.
  const fp = await request.post(apiBase + '/users/forgot-password', { data: { email } })
  expect(fp.status()).toBeLessThan(500) // policy: never leaks user existence

  const reset = await request.post(apiBase + '/users/reset-password', {
    data: { email, token: 'tampered-token', password: 'OtherPass!' },
  })
  expect(reset.status()).toBeGreaterThanOrEqual(400)
})
