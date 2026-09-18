import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, asList, captureNetwork, signup } from './_helpers.js'

test.describe('/notifications', () => {
  test('renders the notifications feed seeded for the new user', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.getByRole('heading', { name: /^Notifications$/i })).toBeVisible()
    })
    const listReq = reqs.find((r) => r.method === 'GET' && /\/api\/notifications(\?|$)/.test(r.url))
    expect(listReq, 'mount must fetch /api/notifications').toBeTruthy()
    expect(listReq?.status).toBe(200)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/notifications')
    const list = asList(body)
    expect(list.length).toBeGreaterThan(0)
  })

  test('"Mark all as read" zeroes the unread count and persists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const before = asList((await apiRequest<unknown>(page, 'GET', '/api/notifications')).body)
    const unreadBefore = before.filter((n: any) => n.unread).length
    if (unreadBefore === 0) test.skip(true, 'No unread notifications to mark')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="button-mark-all-read"]').click()
      await page.waitForTimeout(800)
    })
    const markReq = reqs.find(
      (r) => r.method === 'POST' && /\/api\/notifications\/read-all/.test(r.url),
    )
    expect(markReq, 'POST /api/notifications/read-all should fire').toBeTruthy()
    expect(markReq?.status).toBeLessThan(400)
    const after = asList((await apiRequest<unknown>(page, 'GET', '/api/notifications')).body)
    const unreadAfter = after.filter((n: any) => n.unread).length
    expect(unreadAfter).toBe(0)
  })

  test('unread count badge matches the API state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const list = asList(
      (await apiRequest<unknown>(page, 'GET', '/api/notifications')).body,
    ) as any[]
    const unread = list.filter((n) => n.unread).length
    if (unread > 0) {
      await expect(page.getByText(`${unread} unread`, { exact: false })).toBeVisible()
    }
  })

  test('reload preserves notifications page (token persists)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /^Notifications$/i })).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL(/\/notifications$/)
    await expect(page.getByRole('heading', { name: /^Notifications$/i })).toBeVisible({
      timeout: 10_000,
    })
  })
})
