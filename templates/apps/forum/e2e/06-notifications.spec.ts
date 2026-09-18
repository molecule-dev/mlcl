/**
 * Notifications inbox: derived feed + mark-all-read upsert.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, seedThread, signup } from './_helpers.js'

test.describe('forum notifications', () => {
  test('GET /notifications returns the {items, unreadCount, lastSeenAt} shape', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBeLessThan(400)
    const body = (await res.json()) as {
      items?: unknown[]
      unreadCount?: number
      lastSeenAt?: string | null
    }
    expect(Array.isArray(body.items)).toBe(true)
    expect(typeof body.unreadCount).toBe('number')
  })

  test('reply on own thread surfaces in the OP\u2019s notifications', async ({ page }) => {
    const op = await signup(page)
    const replier = await signup(page)
    const thread = await seedThread(page, op.accessToken, { title: `notif-thread-${Date.now()}` })

    const reply = await page.request.post(`${API_BASE}/threads/${thread.id}/replies`, {
      headers: apiHeaders(replier.accessToken),
      data: { body: 'Pinging the OP', parent_reply_id: null },
      failOnStatusCode: false,
    })
    expect(reply.status()).toBeLessThan(400)

    const notifs = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(op.accessToken),
    })
    expect(notifs.status()).toBeLessThan(400)
    const body = (await notifs.json()) as { items?: Array<{ threadId?: string }> }
    expect(body.items?.some((it) => it.threadId === thread.id)).toBe(true)
  })

  test('mark-all-read upserts notifications_seen_status', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.post(`${API_BASE}/notifications/mark-all-read`, {
      headers: apiHeaders(accessToken),
      data: {},
      failOnStatusCode: false,
    })
    expect(res.status()).toBeLessThan(400)
    const body = (await res.json()) as { lastSeenAt?: string }
    expect(typeof body.lastSeenAt).toBe('string')

    // Calling it again must not 500 (upsert path).
    const second = await page.request.post(`${API_BASE}/notifications/mark-all-read`, {
      headers: apiHeaders(accessToken),
      data: {},
      failOnStatusCode: false,
    })
    expect(second.status()).toBeLessThan(400)
  })
})
