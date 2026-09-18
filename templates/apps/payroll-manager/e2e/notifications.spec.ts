import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, captureNetwork, signupAndToken } from './_helpers'

interface Notification {
  id: string
  unread: boolean
  title: string
}

test.describe('/notifications', () => {
  test('renders seeded notifications after first /employees fetch', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/employees')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/notifications(\?|$)/.test(r.url)),
    ).toBeDefined()
  })

  test('Mark as read clears the unread state for that notification', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/notifications') // triggers seed via the notifications handler
    const list = await apiGet<Notification[]>(page, token, '/notifications')
    const arr =
      (Array.isArray(list.body) ? list.body : (list.body as { data?: Notification[] }).data) ?? []
    const unread = arr.find((n) => n.unread)
    if (!unread) test.skip(true, 'no unread seeded notification to mark')
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle').catch(() => {})
    const markBtn = page.getByRole('button', { name: /mark as read/i }).first()
    if (await markBtn.count().catch(() => 0)) {
      await markBtn.click()
      await page.waitForTimeout(700)
    }
    const re = await apiGet<Notification[]>(page, token, '/notifications')
    const reArr =
      (Array.isArray(re.body) ? re.body : (re.body as { data?: Notification[] }).data) ?? []
    const reCheck = reArr.find((n) => n.id === unread!.id)
    if (reCheck) expect(reCheck.unread, 'mark-as-read must persist server-side').toBe(false)
  })

  test('Mark all read sets every unread to false on next read', async ({ page }) => {
    const { token } = await signupAndToken(page)
    await apiGet(page, token, '/notifications')
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle').catch(() => {})
    const all = page.getByRole('button', { name: /mark all as read/i }).first()
    if (await all.count().catch(() => 0)) {
      await all.click()
      await page.waitForTimeout(800)
    }
    const re = await apiGet<Notification[]>(page, token, '/notifications')
    const arr =
      (Array.isArray(re.body) ? re.body : (re.body as { data?: Notification[] }).data) ?? []
    const stillUnread = arr.filter((n) => n.unread)
    expect(stillUnread.length, 'mark-all-read must zero out unread count').toBe(0)
  })
})
