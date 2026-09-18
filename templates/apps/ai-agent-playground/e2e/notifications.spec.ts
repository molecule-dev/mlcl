import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Notifications page', () => {
  test('redirects unauthenticated visitors', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders header + Unread/Read tabs + empty state; GET /api/notifications fires', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.locator('[data-mol-id="page-notifications"]')).toBeVisible()
    })
    await expect(page.locator('[data-mol-id="notifications-tab-unread"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="notifications-tab-read"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="notifications-empty"]')).toBeVisible()
    const gets = whereUrl(reqs, /\/api\/notifications(\?|$)/, 'GET')
    expect(gets.length, 'GET /api/notifications on load').toBeGreaterThanOrEqual(1)
  })

  test('seeded notification renders + can be marked read (read-after-write)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = authedApi(request, session.accessToken!)
    const created = await api.post('/notifications', {
      kind: 'failed',
      title: 'run_8e4f',
      body: 'Run failed: tool timeout.',
    })
    expect(created.status()).toBe(201)
    const notification = await created.json()

    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/Run failed: tool timeout/i)).toBeVisible({ timeout: 10000 })

    await page.locator('[data-mol-id="notification-mark-read"]').first().click()
    await expect(page.locator('[data-mol-id="notifications-empty"]')).toBeVisible({
      timeout: 10000,
    })

    const after = await api.get(`/notifications`)
    const rows = (await after.json()) as Array<{ id: string; read_at?: string | null }>
    const row = rows.find((r) => r.id === notification.id)
    expect(row?.read_at, 'mark-read should persist a read_at timestamp').toBeTruthy()
  })

  test('"Mark all as read" clears every unread row (read-after-write)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = authedApi(request, session.accessToken!)
    await api.post('/notifications', { kind: 'info', title: 'a', body: 'first' })
    await api.post('/notifications', { kind: 'info', title: 'b', body: 'second' })

    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText('first')).toBeVisible({ timeout: 10000 })

    await page.locator('[data-mol-id="notifications-mark-all-read"]').click()
    await expect(page.locator('[data-mol-id="notifications-empty"]')).toBeVisible({
      timeout: 10000,
    })

    const after = await api.get('/notifications?read=false')
    const remaining = (await after.json()) as unknown[]
    expect(remaining).toEqual([])
  })
})
