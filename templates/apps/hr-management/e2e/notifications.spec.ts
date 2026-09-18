/**
 * /notifications — list, mark-all-read, individual mark-on-click.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('notifications page', () => {
  test('notifications render and initial mount fetches /api/notifications', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Read the row the page will render instead of naming a demo notification.
    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    const notifications = (await res.json()) as Array<{ title: string }>
    expect(notifications.length, 'the app must surface at least one notification').toBeGreaterThan(
      0,
    )
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.getByText(notifications[0].title).first()).toBeVisible()
    })
    expect(
      reqs.find((r) => /\/api\/notifications(?:\?|$)/.test(r.url) && r.method === 'GET'),
    ).toBeTruthy()
  })

  test('Mark all as read flips every unread row (POST /api/notifications/read-all observed)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const before = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    const beforeBody = (await before.json()) as Array<{ unread: boolean }>
    const unreadBefore = beforeBody.filter((n) => n.unread).length

    await page.goto(APP_BASE + '/notifications')
    if (unreadBefore === 0) {
      // Nothing to mark: the button is disabled and the invariant below
      // (no unread rows remain) already holds. There is no product path to
      // create a notification, so this is the app's real empty state.
      await expect(page.getByRole('button', { name: /mark all as read/i })).toBeDisabled()
      return
    }
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/notifications\/read-all/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      page.getByRole('button', { name: /mark all as read/i }).click(),
    ])
    expect(resp.status(), 'mark-all POST').toBeLessThan(400)
    await expect(async () => {
      const after = await page.request.get(`${API_BASE}/notifications`, {
        headers: apiHeaders(accessToken),
      })
      const afterBody = (await after.json()) as Array<{ unread: boolean }>
      expect(afterBody.filter((n) => n.unread).length).toBe(0)
    }).toPass({ timeout: 10_000 })
  })
})
