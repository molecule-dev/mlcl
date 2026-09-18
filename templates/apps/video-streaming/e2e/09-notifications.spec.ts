import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedFetch, captureNetwork, signup } from './_helpers.js'

test.describe('notifications page', () => {
  test('Notifications page mounts and lists are read from /api/notifications', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/notifications/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('Mark all read POSTs to /read-all and persists', async ({ page }) => {
    const { accessToken } = await signup(page)

    // Manually create a notification so the read-all endpoint has work to do.
    const create = await page.request.post(
      `${APP_BASE.replace(':3210', ':4210')}/api/notifications`,
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        data: { type: 'system', body: 'e2e marker' },
        failOnStatusCode: false,
      },
    )
    // /api/notifications POST may not be exposed for users — accept either
    // 201 (created) or 401/404 (handler doesn't accept user inserts) and
    // skip the POST half if so. The mark-all endpoint MUST exist either way.
    const created = create.status() < 300
    if (!created)
      test.info().annotations.push({
        type: 'note',
        description: 'POST /api/notifications not exposed; skipping seed',
      })

    const r = await authedFetch(page, '/api/notifications/read-all', { method: 'POST' })
    expect(r.status, JSON.stringify(r.body)).toBeLessThan(400)

    const after = await authedFetch<Array<Record<string, unknown>>>(page, '/api/notifications')
    expect(after.status).toBe(200)
    const rows = (after.body ?? []) as Array<Record<string, unknown>>
    // After mark-all, no row may have read_at === null.
    expect(rows.every((n) => n.read_at != null || n.readAt != null || n.read === true)).toBe(true)
  })
})
