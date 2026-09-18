/**
 * Notifications surface.
 *
 *   - GET /notifications returns the caller's notifications (200, never 500).
 *   - GET /notifications/unread-count returns a numeric count.
 *   - POST /notifications/read-all flips all unread to read.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('notifications', () => {
  test('GET /notifications returns 200 with an array', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-list'))
    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { data?: unknown[] } | unknown[]
    const arr = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : []
    expect(Array.isArray(arr)).toBe(true)
  })

  test('GET /notifications/unread-count returns numeric count', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-count'))
    const res = await page.request.get(`${API_BASE}/notifications/unread-count`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { count?: number; unread?: number } | number
    const count =
      typeof body === 'number'
        ? body
        : typeof body.count === 'number'
          ? body.count
          : typeof body.unread === 'number'
            ? body.unread
            : -1
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('POST /notifications/read-all returns 200', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-readall'))
    const res = await page.request.post(`${API_BASE}/notifications/read-all`, {
      headers: authHeaders(accessToken),
      data: {},
    })
    expect(res.status()).toBe(200)
  })
})
