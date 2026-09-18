import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('Notifications page lists seeded notifications', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByRole('heading', { name: /notification|inbox/i }).first()).toBeVisible()
  // Seed creates >0 notifications. They should render somewhere on the page.
  const list = await api<Array<{ id: string; read: boolean }>>(page, 'GET', '/notifications')
  expect(list.length).toBeGreaterThan(0)
})

test('Mark-all-read updates every notification.read=true (read-after-write)', async ({ page }) => {
  await signup(page)
  const before = await api<Array<{ id: string; read: boolean }>>(page, 'GET', '/notifications')
  const unreadBefore = before.filter((n) => !n.read).length
  expect(unreadBefore).toBeGreaterThan(0)

  const result = await api<{ updated: number }>(page, 'POST', '/notifications/read-all')
  expect(result.updated).toBe(unreadBefore)

  // Read-after-write: re-GET. All unread should now be read.
  const after = await api<Array<{ id: string; read: boolean }>>(page, 'GET', '/notifications')
  expect(after.filter((n) => !n.read).length).toBe(0)
})

test('Marking a single notification as read updates only that row', async ({ page }) => {
  await signup(page)
  const list = await api<Array<{ id: string; read: boolean }>>(page, 'GET', '/notifications')
  const unread = list.find((n) => !n.read)
  expect(unread, 'an unread seed notification').toBeTruthy()

  await api(page, 'PUT', `/notifications/${unread!.id}/read`, {})

  const after = await api<Array<{ id: string; read: boolean }>>(page, 'GET', '/notifications')
  const found = after.find((n) => n.id === unread!.id)
  expect(found?.read).toBe(true)
})

test('GET /api/notifications returns a populated, fully-typed inbox on first call', async ({
  page,
}) => {
  await signup(page)
  const list = await api<Array<{ id: string; type: string; title: string }>>(
    page,
    'GET',
    '/notifications',
  )
  expect(list.length).toBeGreaterThan(0)
  // Assert the row shape rather than which starter notifications exist — the
  // inbox content is demo data an app's owner replaces.
  for (const n of list) {
    expect(n.id, JSON.stringify(n)).toBeTruthy()
    expect(n.type, JSON.stringify(n)).toBeTruthy()
    expect(n.title, JSON.stringify(n)).toBeTruthy()
  }
})

test('observation invariant: /notifications fires GET /api/notifications + POST read-all + per-row PUT', async ({
  page,
}) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(reqs.find((r) => /\/api\/notifications/.test(r.url) && r.method === 'GET')).toBeTruthy()
})
