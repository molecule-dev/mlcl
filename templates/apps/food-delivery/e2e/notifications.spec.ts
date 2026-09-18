import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, placeOrderViaApi, signup, uniqueEmail } from './_helpers.js'

/**
 * Notifications flow.
 *
 * Invariants verified:
 * - GET /api/notifications seeds demo notifications for fresh users.
 * - Placing an order adds a real order_status notification.
 * - Clicking an unread notification calls /:id/read and the next GET
 *   returns unread:false for that row.
 * - "Mark all read" calls /read-all and the next GET shows unread=0.
 */

test.describe('notifications', () => {
  test('list seeds demo notifications for a fresh user', async ({ page }) => {
    await signup(page, uniqueEmail('fd-notif-seed'))
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /Notifications/i, level: 1 })).toBeVisible()
    await expect(page.getByTestId('notifications-list')).toBeVisible()
    const rows = await page.getByTestId('notification-row').count()
    expect(rows).toBeGreaterThan(0)
  })

  test('placing an order surfaces an order_status notification', async ({ page }) => {
    await signup(page, uniqueEmail('fd-notif-order'))
    await placeOrderViaApi(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/Order placed/i).first()).toBeVisible()
  })

  test('mark-all-read clears unread state for every row', async ({ page }) => {
    await signup(page, uniqueEmail('fd-notif-mark-all'))
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByTestId('notifications-list')).toBeVisible()

    // Get initial unread count from API.
    const before = await page.request.get(API_BASE + '/notifications').then((r) => r.json())
    const unreadBefore = before?.unread ?? 0
    expect(unreadBefore).toBeGreaterThan(0)

    const respPromise = page.waitForResponse(
      (r) => /\/api\/notifications\/read-all$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 10_000 },
    )
    await page.getByTestId('notifications-mark-all-read').click()
    await respPromise

    // Read-after-write: API reports zero unread.
    const after = await page.request.get(API_BASE + '/notifications').then((r) => r.json())
    expect(after?.unread ?? 0).toBe(0)
    // Mark-all button should disappear (unread = 0).
    await expect(page.getByTestId('notifications-mark-all-read')).toHaveCount(0)
  })

  test('clicking an unread notification marks it as read', async ({ page }) => {
    await signup(page, uniqueEmail('fd-notif-mark-one'))
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByTestId('notifications-list')).toBeVisible()
    // Wait until at least one unread row is present before we set up the
    // response listener — without this, the listener can be armed before
    // any row is rendered and the subsequent click can race a navigation
    // that tears the page down before we observe the POST.
    const firstRow = page.getByTestId('notification-row').first()
    await expect(firstRow).toBeVisible()
    await expect(firstRow).toHaveAttribute('data-unread', 'true')

    // The row is a <Link> with a fire-and-forget POST on click — clicking
    // it can navigate away from /notifications before the response lands.
    // Arm the response listener BEFORE the click and await both in a Promise.all
    // so the response is captured regardless of whether the page closes.
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          /\/api\/notifications\/[\w-]+\/read$/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      firstRow.click(),
    ])
    expect([200, 204]).toContain(resp.status())

    // Read-after-write: at least one row is now read.
    const after = await page.request.get(API_BASE + '/notifications').then((r) => r.json())
    const readRows = (after?.data ?? []).filter((n: { unread: boolean }) => !n.unread)
    expect(readRows.length).toBeGreaterThan(0)
  })
})
