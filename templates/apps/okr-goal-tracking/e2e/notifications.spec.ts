import { test, expect, type Page } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  seedKeyResult,
  seedObjective,
  signup,
} from './_helpers.js'

interface NotifRow {
  id: string
  type: string
  title: string
  body?: string | null
  read_at?: string | null
  created_at?: string
}

/** Seed a notification via the natural domain flow: posting a check-in
 *  produces an inbox notification (the API does not expose a direct
 *  POST /notifications surface). Confidence/status maps to the
 *  notification type, so we use the `status` arg to pick the variant. */
async function seedViaCheckIn(
  page: Page,
  accessToken: string,
  args: {
    status?: 'on_track' | 'at_risk' | 'off_track' | 'completed'
    note?: string
    value?: number
  } = {},
) {
  const obj = await seedObjective(page, accessToken)
  const kr = await seedKeyResult(page, accessToken, {
    objective_id: obj.id,
    metric_type: 'number',
    start_value: 0,
    target_value: 100,
  })
  const checkRes = await page.request.post(`${API_BASE}/check-ins`, {
    headers: apiHeaders(accessToken),
    data: {
      key_result_id: kr.id,
      value: args.value ?? 25,
      confidence: 'high',
      status: args.status ?? 'on_track',
      note: args.note ?? 'A test check-in.',
    },
    failOnStatusCode: false,
  })
  expect(checkRes.status(), await checkRes.text()).toBeLessThan(300)
  const list = await page.request.get(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
  })
  const all = (await list.json()) as NotifRow[]
  expect(all.length, 'a check-in must produce a notification row').toBeGreaterThan(0)
  return all[0]
}

test.describe('Notifications /notifications', () => {
  test('empty state visible for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByTestId('notifications-empty')).toBeVisible()
  })

  test('initial GET /api/notifications fires', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const got = reqs.find((r) => r.method === 'GET' && /\/api\/notifications(\?|$)/.test(r.url))
    expect(got).toBeTruthy()
    expect(got!.status).toBe(200)
  })

  test('check-in side effect creates a notification visible on the page', async ({ page }) => {
    const { accessToken } = await signup(page)
    const notif = await seedViaCheckIn(page, accessToken!, { status: 'on_track' })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('main')).toContainText(notif.title)
  })

  test('Unread filter still shows freshly created (no read_at) rows', async ({ page }) => {
    const { accessToken } = await signup(page)
    const notif = await seedViaCheckIn(page, accessToken!, { status: 'on_track' })
    await page.goto(APP_BASE + '/notifications')
    const unreadButton = page.getByRole('button', { name: /^unread$/i }).first()
    if (await unreadButton.count().catch(() => 0)) await unreadButton.click()
    await expect(page.locator('main')).toContainText(notif.title)
  })

  test('Mark as read flips read_at on server (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const notif = await seedViaCheckIn(page, accessToken!, {
      status: 'on_track',
      note: 'mark-read-target',
    })
    await page.goto(APP_BASE + '/notifications')
    const reqs = await captureNetwork(page, async () => {
      const row = page.locator('main').getByText(notif.title).first()
      await row.scrollIntoViewIfNeeded()
      const markBtn = page.getByTestId(`notification-mark-read-${notif.id}`)
      if (await markBtn.count().catch(() => 0)) {
        await markBtn.click()
      } else {
        // Fall back to the first generic "Mark as read" button on the row.
        await page
          .getByRole('button', { name: /mark as read|mark read/i })
          .first()
          .click()
      }
      await page.waitForTimeout(800)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/notifications\/[^/]+\/read/.test(r.url),
    )
    expect(post, 'POST /api/notifications/:id/read must fire on click').toBeTruthy()
    expect(post!.status).toBeLessThan(300)
    const fresh = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken!),
    })
    const list = (await fresh.json()) as NotifRow[]
    const found = list.find((n) => n.id === notif.id)
    expect(found, 'notification still present after mark-read').toBeTruthy()
    expect(found!.read_at, 'read_at must be populated after mark-read').toBeTruthy()
  })

  test('Delete removes the row from the server', async ({ page }) => {
    const { accessToken } = await signup(page)
    const notif = await seedViaCheckIn(page, accessToken!, {
      status: 'on_track',
      note: 'delete-target',
    })
    await page.goto(APP_BASE + '/notifications')
    const reqs = await captureNetwork(page, async () => {
      const delBtn = page.getByTestId(`notification-delete-${notif.id}`)
      if (await delBtn.count().catch(() => 0)) {
        await delBtn.click()
      } else {
        await page
          .getByRole('button', { name: /^delete$/i })
          .first()
          .click()
      }
      await page.waitForTimeout(800)
    })
    const del = reqs.find((r) => r.method === 'DELETE' && /\/api\/notifications\//.test(r.url))
    expect(del, 'DELETE /api/notifications/:id must fire on click').toBeTruthy()
    const fresh = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken!),
    })
    const list = (await fresh.json()) as NotifRow[]
    expect(list.find((n) => n.id === notif.id)).toBeUndefined()
  })
})
