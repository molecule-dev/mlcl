import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  createRecording,
  inviteMember,
  primaryWorkspace,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('shared /shared', () => {
  test('page loads and hits /api/recordings/feed', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/shared')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => /\/api\/recordings\/feed/.test(r.url) && r.method === 'GET')
    expect(call?.status).toBe(200)
  })

  test('brand-new user sees no recordings they own in /feed', async ({ page }) => {
    const owner = await signup(page, uniqueEmail('feed-owner'))
    // Owner created their own private clip — should not appear in their own feed.
    const rec = await createRecording(page, owner.accessToken, {
      title: 'Solo private clip',
      visibility: 'private',
    })
    const res = await page.request.get(`${API_BASE}/recordings/feed`, {
      headers: authHeaders(owner.accessToken),
    })
    const body = (await res.json()) as Array<{ id: string; owner_id: string }>
    expect(Array.isArray(body)).toBe(true)
    expect(body.some((r) => r.id === rec.id)).toBe(false)
    expect(body.every((r) => r.owner_id !== owner.userId)).toBe(true)
  })

  test('teammate-shared workspace recording shows up in viewer feed', async ({ page }) => {
    const owner = await signup(page, uniqueEmail('owner'))
    const ws = await primaryWorkspace(page, owner.accessToken)
    const viewer = await signup(page, uniqueEmail('viewer'))
    // [M1-1] No localStorage seeding needed — createRecording/inviteMember use
    // explicit authHeaders(owner.accessToken) Bearer tokens directly.
    const rec = await createRecording(page, owner.accessToken, {
      title: 'Workspace clip',
      visibility: 'workspace',
      workspace_id: ws.id,
    })
    await inviteMember(page, owner.accessToken, ws.id, viewer.email)
    const feed = await page.request.get(`${API_BASE}/recordings/feed`, {
      headers: authHeaders(viewer.accessToken),
    })
    const list = (await feed.json()) as Array<{ id: string }>
    expect(list.some((r) => r.id === rec.id)).toBe(true)
  })

  test('public recording appears in any signed-in user feed', async ({ page }) => {
    const owner = await signup(page, uniqueEmail('pub-owner'))
    const stranger = await signup(page, uniqueEmail('pub-stranger'))
    const rec = await createRecording(page, owner.accessToken, {
      title: 'Public clip',
      visibility: 'public',
    })
    const feed = await page.request.get(`${API_BASE}/recordings/feed`, {
      headers: authHeaders(stranger.accessToken),
    })
    const list = (await feed.json()) as Array<{ id: string }>
    expect(list.some((r) => r.id === rec.id)).toBe(true)
  })
})
