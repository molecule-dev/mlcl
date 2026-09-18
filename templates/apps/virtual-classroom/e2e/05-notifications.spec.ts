/**
 * Notification outcome tests.
 *
 * Asserts on inbox state — seed creates 2 unread notifications, mark
 * one read makes it disappear from `?unread=true`, delete shrinks
 * the list.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { api, signup } from './_helpers.js'

interface NotificationRow {
  id: string
  user_id: string
  title: string
  read_at: string | null
}

test('GET /notifications returns the seeded welcome + assignment notifications', async ({
  page,
}) => {
  await signup(page)
  const list = await api<NotificationRow[]>(page, 'GET', '/notifications')
  expect(list.length, 'seed adds at least 2 notifications').toBeGreaterThanOrEqual(2)
  for (const n of list) expect(n.read_at, `${n.title} starts unread`).toBeNull()
})

test('POST /notifications/:id/read marks one read and removes it from ?unread=true', async ({
  page,
}) => {
  await signup(page)
  const before = await api<NotificationRow[]>(page, 'GET', '/notifications?unread=true')
  expect(before.length).toBeGreaterThan(0)
  const target = before[0]
  await api(page, 'POST', `/notifications/${target.id}/read`)
  const after = await api<NotificationRow[]>(page, 'GET', '/notifications?unread=true')
  expect(
    after.find((n) => n.id === target.id),
    'no longer unread',
  ).toBeFalsy()
  // And the full list shows it as read now
  const all = await api<NotificationRow[]>(page, 'GET', '/notifications')
  expect(all.find((n) => n.id === target.id)?.read_at).toBeTruthy()
})

test('POST /notifications/read-all clears the unread queue', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/notifications/read-all')
  const unread = await api<NotificationRow[]>(page, 'GET', '/notifications?unread=true')
  expect(unread).toEqual([])
})

test('DELETE /notifications/:id removes it from the list', async ({ page }) => {
  await signup(page)
  const list = await api<NotificationRow[]>(page, 'GET', '/notifications')
  const target = list[0]
  await api(page, 'DELETE', `/notifications/${target.id}`)
  const after = await api<NotificationRow[]>(page, 'GET', '/notifications')
  expect(
    after.find((n) => n.id === target.id),
    'deleted notification gone',
  ).toBeFalsy()
  expect(after.length).toBe(list.length - 1)
})
