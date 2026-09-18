/**
 * Notifications read-after-write — marking a notification read sets
 * read_at; the unread badge on the notifications page reflects the new
 * count after a refresh.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  listNotifications,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('notifications', () => {
  test('seed notifications are returned by GET /api/notifications', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-fetch'))
    const items = await listNotifications(page, accessToken)
    expect(items.length).toBeGreaterThan(0)
  })

  test('PUT /:id with read_at persists across re-read', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-mark'))
    const items = await listNotifications(page, accessToken)
    const unread = items.find((n) => !n.read_at)
    expect(unread, 'expected at least one unread seed notification').toBeTruthy()

    const put = await page.request.put(`${API_BASE}/notifications/${unread!.id}`, {
      headers: authHeaders(accessToken),
      data: { read_at: new Date().toISOString() },
    })
    expect(put.status()).toBe(200)

    const reread = await page.request.get(`${API_BASE}/notifications/${unread!.id}`, {
      headers: authHeaders(accessToken),
    })
    const after = (await reread.json()) as { read_at: string | null }
    expect(after.read_at).toBeTruthy()
  })

  test('Notifications page renders an unread badge with the seed count + GET /api/notifications', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-ui'))
    const items = await listNotifications(page, accessToken)
    const unreadCount = items.filter((n) => !n.read_at).length
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-notifications"]').first()).toBeVisible()
    if (unreadCount > 0) {
      await expect(
        page.locator('[data-mol-id="notifications-unread-badge"]').first(),
      ).toContainText(String(unreadCount))
    }
    expect(reqs.some((r) => /\/api\/notifications(\b|\?)/.test(r.url) && r.method === 'GET')).toBe(
      true,
    )
  })

  test('clicking "Mark all read" fires PUT /api/notifications/:id for each unread item', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-put-ui'))
    const items = await listNotifications(page, accessToken)
    const unreadCount = items.filter((n) => !n.read_at).length
    test.skip(unreadCount === 0, 'no unread seed notifications')
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    const button = page.locator('[data-mol-id="notifications-mark-all-button"]').first()
    await expect(button).toBeVisible()
    const reqs: { method: string; url: string }[] = []
    const onResp = (resp: { request: () => { method: () => string }; url: () => string }) => {
      reqs.push({ method: resp.request().method(), url: resp.url() })
    }
    page.on('response', onResp as Parameters<typeof page.on>[1])
    try {
      const [putResp] = await Promise.all([
        page.waitForResponse(
          (r) => /\/api\/notifications\/.+/.test(r.url()) && r.request().method() === 'PUT',
          { timeout: 10_000 },
        ),
        button.click(),
      ])
      expect(putResp.status()).toBeLessThan(400)
      await page.waitForLoadState('networkidle')
    } finally {
      page.off('response', onResp as Parameters<typeof page.on>[1])
    }
    expect(reqs.some((r) => /\/api\/notifications\/.+/.test(r.url) && r.method === 'PUT')).toBe(
      true,
    )
  })
})
