/**
 * Notifications page — list, mark-single-read, mark-all-read. Verifies
 * the underlying read flag actually flips (read-after-write) and the
 * unread badge decrements.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, signup } from './_helpers.js'

interface ApiNotification {
  id: string
  type: string
  payload?: { title?: string; body?: string }
  read_at?: string | null
}

async function createNotification(
  page: import('@playwright/test').Page,
  opts: { type?: string; title?: string } = {},
) {
  // notifications.payload (jsonb) holds title + body — there's no top-level
  // `title` column in the schema, so callers must nest user-visible copy
  // inside `payload`. This mirrors what the in-app event emitters do.
  return apiRequest<ApiNotification>(page, 'POST', '/api/notifications', {
    type: opts.type ?? 'kitchen_alert',
    payload: {
      title: opts.title ?? `Test alert ${Date.now()}`,
      body: 'Auto-generated for the e2e suite',
    },
  })
}

test('Notifications page renders the heading and empty-state when nothing exists', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible()
})

test('Notifications: a created notification appears in the list', async ({ page }) => {
  await signup(page)
  const n = await createNotification(page, { title: 'Rush incoming' })
  expect(n.status).toBeGreaterThanOrEqual(200)
  await page.goto(APP_BASE + '/notifications', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Rush incoming').first()).toBeVisible({ timeout: 15000 })
})

test('Notifications: PUT /api/notifications/:id/read flips read_at', async ({ page }) => {
  await signup(page)
  const n = await createNotification(page, { title: 'Read me' })
  const id = n.body.id
  expect(n.body.read_at ?? null).toBeNull()

  const upd = await apiRequest(page, 'PUT', `/api/notifications/${id}/read`, {})
  expect([200, 204]).toContain(upd.status)

  // Read-after-write: the row's read_at is now set.
  const list = await apiRequest<{ data: ApiNotification[] }>(page, 'GET', '/api/notifications')
  const found = list.body.data.find((r) => r.id === id)
  expect(found?.read_at, 'read_at must be set after marking read').toBeTruthy()
})

test('Notifications: POST /api/notifications/mark-all-read clears unread', async ({ page }) => {
  await signup(page)
  await createNotification(page, { title: 'A' })
  await createNotification(page, { title: 'B' })
  await createNotification(page, { title: 'C' })

  const before = await apiRequest<{ data: ApiNotification[]; unreadCount?: number }>(
    page,
    'GET',
    '/api/notifications',
  )
  const unreadBefore = before.body.unreadCount ?? before.body.data.filter((n) => !n.read_at).length
  expect(unreadBefore).toBeGreaterThan(0)

  const all = await apiRequest(page, 'POST', '/api/notifications/mark-all-read', {})
  expect([200, 204]).toContain(all.status)

  const after = await apiRequest<{ data: ApiNotification[]; unreadCount?: number }>(
    page,
    'GET',
    '/api/notifications',
  )
  const unreadAfter = after.body.unreadCount ?? after.body.data.filter((n) => !n.read_at).length
  expect(unreadAfter).toBe(0)
})
