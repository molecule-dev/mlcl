import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  createRecording,
  inviteMember,
  postComment,
  primaryWorkspace,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('notifications /notifications', () => {
  test('page loads and hits /api/notifications', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => /\/api\/notifications/.test(r.url) && r.method === 'GET')
    expect(call?.status).toBe(200)
  })

  test('feed is empty for a brand-new user', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual([])
  })

  test('a teammate comment surfaces as a notification with kind=comment', async ({ page }) => {
    const owner = await signup(page, uniqueEmail('owner-n'))
    const ws = await primaryWorkspace(page, owner.accessToken)
    const viewer = await signup(page, uniqueEmail('viewer-n'))
    const rec = await createRecording(page, owner.accessToken, {
      title: 'Notif clip',
      visibility: 'workspace',
      workspace_id: ws.id,
    })
    await inviteMember(page, owner.accessToken, ws.id, viewer.email)
    await postComment(page, viewer.accessToken, rec.id, 'Loved this!')

    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(owner.accessToken),
    })
    const body = (await res.json()) as Array<{ kind: string; recording_id: string }>
    expect(body.some((n) => n.kind === 'comment' && n.recording_id === rec.id)).toBe(true)
  })

  test('owner does NOT see notifications for their own actions', async ({ page }) => {
    const owner = await signup(page, uniqueEmail('owner-self'))
    const rec = await createRecording(page, owner.accessToken, {
      title: 'Self-comment clip',
      visibility: 'workspace',
    })
    await postComment(page, owner.accessToken, rec.id, 'Talking to myself')
    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(owner.accessToken),
    })
    const body = (await res.json()) as Array<unknown>
    expect(body).toEqual([])
  })

  test('filter buttons render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    const filterBtn = page.getByRole('button', { name: /all|comments|views|invites/i }).first()
    await expect(filterBtn.first()).toBeAttached()
  })
})
