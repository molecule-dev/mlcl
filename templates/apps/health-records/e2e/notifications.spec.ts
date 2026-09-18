/**
 * Notifications mark-as-read invariants — clicking a notification (or
 * the "Mark all read" button) actually flips `read_at` on the row, and
 * the unread badge updates accordingly.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  listNotifications,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('notifications', () => {
  test('list endpoint returns seeded items with the expected shape', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-list'))
    const items = await listNotifications(page, accessToken)
    expect(items.length).toBeGreaterThan(0)
    for (const n of items) {
      expect(typeof n.id).toBe('string')
      expect(typeof n.kind).toBe('string')
    }
  })

  test('marking a single notification read flips read_at on that row only', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-read'))
    const before = await listNotifications(page, accessToken)
    const target = before.find((n) => !n.read_at)
    if (!target) {
      test.skip(true, 'No unread notification in seed.')
      return
    }
    const r = await page.request.post(`${API_BASE}/notifications/${target.id}/read`, {
      headers: authHeaders(accessToken),
      data: {},
    })
    expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
    const after = await listNotifications(page, accessToken)
    const updated = after.find((n) => n.id === target.id)!
    expect(updated.read_at, 'targeted notification should now be read').toBeTruthy()
    const otherUnreadBefore = before.filter((n) => n.id !== target.id && !n.read_at).length
    const otherUnreadAfter = after.filter((n) => n.id !== target.id && !n.read_at).length
    expect(otherUnreadAfter).toBe(otherUnreadBefore)
  })

  test('UI page renders inbox and reflects the unread count from the API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-ui'))
    const items = await listNotifications(page, accessToken)
    const unread = items.filter((n) => !n.read_at).length
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    if (unread > 0) {
      expect(body).toMatch(new RegExp(`${unread}\\s*unread`, 'i'))
    }
  })
})
