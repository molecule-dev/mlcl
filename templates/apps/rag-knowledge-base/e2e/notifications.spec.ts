/**
 * /notifications — Engram alert center.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  createNotification,
  listNotifications,
  signup,
} from './_helpers.js'

test.describe('notifications', () => {
  test('h1 renders "Notifications"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('empty notifications shows the empty placeholder', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-testid="notifications-empty"]')).toBeVisible()
  })

  test('after a direct API insert, the row appears', async ({ page }) => {
    const { accessToken } = await signup(page)
    const note = await createNotification(page, accessToken, {
      title: 'Test notification row',
    })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator(`[data-testid="notifications-row-${note.id}"]`)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('mark-read PUTs /api/notifications/:id and the row becomes data-unread="0"', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const note = await createNotification(page, accessToken, { title: 'Mark read me' })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator(`[data-testid="notifications-row-${note.id}"]`)).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      await page.locator(`[data-testid="notifications-mark-read-${note.id}"]`).click()
      await page.waitForTimeout(1500)
    })
    const put = reqs.find(
      (r) => r.method === 'PUT' && r.url.includes(`/api/notifications/${note.id}`),
    )
    expect(put?.status).toBe(200)
    await expect(page.locator(`[data-testid="notifications-row-${note.id}"]`)).toHaveAttribute(
      'data-unread',
      '0',
    )

    // Read-after-write: backend reflects read_at.
    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    const list = (await res.json()) as Array<{ id: string; read_at: string | null }>
    const row = list.find((n) => n.id === note.id)
    expect(row?.read_at, 'read_at should be set after PUT').not.toBeNull()
  })

  test('dismiss DELETEs /api/notifications/:id and the row vanishes', async ({ page }) => {
    const { accessToken } = await signup(page)
    const note = await createNotification(page, accessToken, { title: 'Dismiss me' })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator(`[data-testid="notifications-row-${note.id}"]`)).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      await page.locator(`[data-testid="notifications-dismiss-${note.id}"]`).click()
      await page.waitForTimeout(1500)
    })
    const del = reqs.find(
      (r) => r.method === 'DELETE' && r.url.includes(`/api/notifications/${note.id}`),
    )
    expect(del?.status).toBeLessThan(400)
    await expect(page.locator(`[data-testid="notifications-row-${note.id}"]`)).toHaveCount(0)
    const after = await listNotifications(page, accessToken)
    expect(after.some((n) => n.id === note.id)).toBe(false)
  })
})
