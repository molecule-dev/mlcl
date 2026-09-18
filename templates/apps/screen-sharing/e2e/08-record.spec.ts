import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  primaryWorkspace,
  signup,
} from './_helpers.js'

test.describe('record /record', () => {
  test('page loads with start-recording control', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/record')
    await page.waitForLoadState('networkidle')
    expect(await page.getByRole('button').count()).toBeGreaterThan(0)
  })

  test('headless fallback creates a recording row in the DB', async ({ page }) => {
    const { accessToken } = await signup(page)
    const ws = await primaryWorkspace(page, accessToken)
    const res = await page.request.post(`${API_BASE}/recordings`, {
      headers: authHeaders(accessToken),
      data: {
        title: 'Headless capture',
        workspace_id: ws.id,
        visibility: 'workspace',
        duration_ms: 5_000,
        video_url: 'https://example.com/headless.webm',
      },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(201)
    const body = (await res.json()) as { id: string; status: string }
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.status).toBe('ready')
  })

  test('captureNetwork sees POST /api/recordings on save', async ({ page }) => {
    const { accessToken } = await signup(page)
    const ws = await primaryWorkspace(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      const res = await page.request.post(`${API_BASE}/recordings`, {
        headers: authHeaders(accessToken),
        data: {
          title: 'Net trace',
          workspace_id: ws.id,
          visibility: 'private',
          duration_ms: 1_000,
          video_url: 'https://example.com/nt.webm',
        },
      })
      expect(res.status()).toBe(201)
    })
    const call = reqs.find((r) => /\/api\/recordings$/.test(r.url) && r.method === 'POST')
    expect(call?.status).toBe(201)
  })

  test('saved recording shows up in the library list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const ws = await primaryWorkspace(page, accessToken)
    const created = await page.request.post(`${API_BASE}/recordings`, {
      headers: authHeaders(accessToken),
      data: {
        title: 'Lib echo',
        workspace_id: ws.id,
        visibility: 'workspace',
        duration_ms: 2_000,
        video_url: 'https://example.com/echo.webm',
      },
      failOnStatusCode: false,
    })
    expect(created.status()).toBe(201)
    const list = await page.request.get(`${API_BASE}/recordings`, {
      headers: authHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ title: string }>
    expect(items.some((r) => r.title === 'Lib echo')).toBe(true)
  })

  test('visibility toggle persists to the saved row', async ({ page }) => {
    const { accessToken } = await signup(page)
    const ws = await primaryWorkspace(page, accessToken)
    const created = await page.request.post(`${API_BASE}/recordings`, {
      headers: authHeaders(accessToken),
      data: {
        title: 'Vis test',
        workspace_id: ws.id,
        visibility: 'public',
        duration_ms: 1_000,
        video_url: 'https://example.com/vis.webm',
      },
    })
    const body = (await created.json()) as { visibility: string }
    expect(body.visibility).toBe('public')
  })
})
