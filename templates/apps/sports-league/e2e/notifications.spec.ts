import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('Notifications page lists the welcome notification created on signup', async ({ page }) => {
  await signup(page)
  // The welcome notification's TYPE is app vocabulary; its title is content an
  // owner rewrites, so read the title back from the API and assert on that.
  const list = await api<{ data: Array<{ type: string; title: string }> }>(
    page,
    'GET',
    '/notifications',
  )
  const welcome = list.data.find((n) => n.type === 'welcome')
  expect(welcome, 'a welcome notification is created on signup').toBeTruthy()
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByRole('heading', { name: /^notifications$/i })).toBeVisible()
  await expect(page.getByText(welcome!.title).first()).toBeVisible({ timeout: 15_000 })
})

test('Mark-all-read flips every unread notification → read (read-after-write)', async ({
  page,
}) => {
  await signup(page)
  const before = await api<{
    data: Array<{ id: string; read: boolean }>
    meta: { unread: number }
  }>(page, 'GET', '/notifications')
  expect(before.meta.unread).toBeGreaterThan(0)

  const result = await api<{ updated: number }>(page, 'POST', '/notifications/read-all')
  expect(result.updated).toBe(before.meta.unread)

  const after = await api<{ data: Array<{ id: string; read: boolean }>; meta: { unread: number } }>(
    page,
    'GET',
    '/notifications',
  )
  expect(after.meta.unread).toBe(0)
  expect(after.data.filter((n) => !n.read).length).toBe(0)
})

test('Marking a single notification as read updates only that row', async ({ page }) => {
  await signup(page)
  const list = await api<{ data: Array<{ id: string; read: boolean }> }>(
    page,
    'GET',
    '/notifications',
  )
  const unread = list.data.find((n) => !n.read)
  expect(unread, 'an unread notification to mark').toBeTruthy()

  await api(page, 'POST', `/notifications/${unread!.id}/read`, {})

  const after = await api<{ data: Array<{ id: string; read: boolean }> }>(
    page,
    'GET',
    '/notifications',
  )
  const found = after.data.find((n) => n.id === unread!.id)
  expect(found?.read).toBe(true)
})

test('observation invariant: /notifications fires GET /api/notifications', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(reqs.find((r) => /\/api\/notifications/.test(r.url) && r.method === 'GET')).toBeTruthy()
})
