import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  createRecording,
  inviteMember,
  listComments,
  listRecordings,
  postComment,
  primaryWorkspace,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('user journey', () => {
  test('end-to-end: signup → record → comment → invite → notification', async ({ page }) => {
    // 1. Owner signs up and bootstraps a workspace
    const owner = await signup(page, uniqueEmail('journey-owner'))
    const ws = await primaryWorkspace(page, owner.accessToken)
    expect(ws.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(ws.plan_key).toBe('free')

    // 2. Owner creates a workspace-shared recording
    const rec = await createRecording(page, owner.accessToken, {
      title: 'Journey clip',
      visibility: 'workspace',
      workspace_id: ws.id,
    })
    expect(rec.workspace_id).toBe(ws.id)

    // 3. Library shows the new recording
    await page.goto(APP_BASE + '/library')
    await expect(page.getByText('Journey clip').first()).toBeVisible({ timeout: 10_000 })
    const owned = await listRecordings(page, owner.accessToken)
    expect(owned.some((r) => r.id === rec.id)).toBe(true)

    // 4. Detail page hits the right endpoints
    await page.goto(`${APP_BASE}/recordings/${rec.id}`)
    await expect(page.getByText('Journey clip').first()).toBeVisible({ timeout: 10_000 })

    // 5. Owner invites a teammate
    const teammate = await signup(page, uniqueEmail('journey-mate'))
    const invite = await inviteMember(page, owner.accessToken, ws.id, teammate.email)
    expect(invite.invited).toBe(true)

    // 6. Teammate sees the recording in their feed
    const feed = await page.request.get(`${API_BASE}/recordings/feed`, {
      headers: authHeaders(teammate.accessToken),
    })
    const list = (await feed.json()) as Array<{ id: string }>
    expect(list.some((r) => r.id === rec.id)).toBe(true)

    // 7. Teammate posts a comment
    const comment = await postComment(page, teammate.accessToken, rec.id, 'Looks great!')
    const comments = await listComments(page, teammate.accessToken, rec.id)
    expect(comments.some((c) => c.id === comment.id)).toBe(true)

    // 8. Owner receives a notification for the comment
    const notifRes = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(owner.accessToken),
    })
    const notifs = (await notifRes.json()) as Array<{ kind: string; recording_id: string }>
    expect(notifs.some((n) => n.kind === 'comment' && n.recording_id === rec.id)).toBe(true)

    // 9. Owner sees the comment count rise in analytics
    const overview = await page.request.get(`${API_BASE}/analytics/overview`, {
      headers: authHeaders(owner.accessToken),
    })
    const a = (await overview.json()) as {
      totalRecordings: number
      commentsThisWeek: number
      topRecordings: Array<{ id: string }>
    }
    expect(a.totalRecordings).toBeGreaterThanOrEqual(1)
    expect(a.commentsThisWeek).toBeGreaterThanOrEqual(1)
    expect(a.topRecordings.some((r) => r.id === rec.id)).toBe(true)

    // 10. Public share URL stays viewable without auth
    const pubRec = await createRecording(page, owner.accessToken, {
      title: 'Public clip',
      visibility: 'public',
    })
    await page.evaluate(() => window.localStorage.clear())
    const pubRes = await page.request.get(`${API_BASE}/recordings/shared/${pubRec.share_token}`)
    expect(pubRes.status()).toBe(200)
  })
})
