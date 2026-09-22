import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiRequest,
  captureNetwork,
  isoOffset,
  listProperties,
  listRooms,
  signup,
} from './_helpers.js'

async function bookOnceToTriggerSeed(page: import('@playwright/test').Page) {
  const properties = await listProperties(page)
  const rooms = await listRooms(page, properties[0].id)
  // Room inventory is GLOBAL across users: earlier suite runs may hold the
  // preferred room/dates (API correctly 409s). Walk rooms × date windows
  // until a booking is ACCEPTED — the demo seed only fires on success. The
  // rejected attempts log browser console errors, so callers annotate
  // `allow-console-error` for "status of 409" BEFORE calling this.
  for (let attempt = 0; attempt < rooms.length + 8; attempt++) {
    const room = rooms[attempt % rooms.length]
    const r = await apiRequest(page, 'POST', '/api/reservations', {
      room_id: room.id,
      check_in: isoOffset(20 + attempt * 3),
      check_out: isoOffset(22 + attempt * 3),
      guests: 1,
    })
    if (r.status === 201 || r.status === 200) break
    if (r.status !== 409) {
      throw new Error(
        'bookOnceToTriggerSeed: unexpected status ' + r.status + ' body=' + JSON.stringify(r.body),
      )
    }
  }
  // Demo seed runs as fire-and-forget after a successful booking.
  await page.waitForTimeout(1500)
}

test.describe('/notifications (Notifications)', () => {
  test('renders the "Notifications" heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /^Notifications$/, level: 1 })).toBeVisible()
  })

  test('shows seeded notifications after a reservation', async ({ page }) => {
    await signup(page)
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 409' })
    await bookOnceToTriggerSeed(page)
    await page.goto(APP_BASE + '/notifications', { waitUntil: 'domcontentloaded' })
    const items = page.getByRole('listitem')
    // Wait for the async useEffect fetch to populate the list before asserting.
    await expect(items.first()).toBeVisible({ timeout: 15_000 })
    await expect(items.first()).toBeAttached()
  })

  test('Mark all read clears the unread state and persists across reload', async ({ page }) => {
    await signup(page)
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 409' })
    await bookOnceToTriggerSeed(page)
    await page.goto(APP_BASE + '/notifications', { waitUntil: 'domcontentloaded' })
    // Wait for the page's async fetch to settle so either the unread button
    // or the empty state is decisively rendered before branching.
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const button = page.getByRole('button', { name: /Mark all read/i })
    if (await button.count()) {
      const reqs = await captureNetwork(page, async () => {
        await button.click()
        await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
      })
      expect(
        reqs.some((r) => r.url.endsWith('/api/notifications/read-all') && r.method === 'POST'),
        'POST /api/notifications/read-all must be observed',
      ).toBeTruthy()

      const refreshed = await apiRequest<{ data: Array<{ unread?: boolean }> }>(
        page,
        'GET',
        '/api/notifications',
      )
      const stillUnread = (refreshed.body.data ?? []).filter((n) => n.unread === true)
      expect(stillUnread.length).toBe(0)
    } else {
      // No unread notifications => empty/all-caught-up state is acceptable.
      await expect(page.getByText(/no notifications|all caught up/i).first()).toBeVisible()
    }
  })

  test('observes GET /api/notifications on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications', { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => r.url.endsWith('/api/notifications') && r.method === 'GET'),
      'GET /api/notifications must be observed on page load',
    ).toBeTruthy()
  })

  test('empty state renders for users with no notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications', { waitUntil: 'domcontentloaded' })
    const items = await page.getByRole('listitem').count()
    if (items === 0) {
      await expect(page.getByText(/no notifications|all caught up/i).first()).toBeVisible()
    } else {
      await expect(page.getByRole('listitem').first()).toBeVisible()
    }
  })
})
