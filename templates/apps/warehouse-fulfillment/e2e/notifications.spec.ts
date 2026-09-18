import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listNotifications, seedSampleData, signup } from './_helpers.js'

test.describe('/notifications mark read + dismiss', () => {
  test('mark-read toggles read_at on the backend row', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)

    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByTestId('notifications-page')).toBeVisible()

    const before = await listNotifications(page, accessToken)
    expect(before.length).toBeGreaterThan(0)
    const unread = before.find((n) => !n.read_at)
    test.skip(!unread, 'no unread notification to mark')
    if (!unread) return

    await page.getByTestId('notification-mark-read').first().click()
    await page.waitForTimeout(800)
    const after = await listNotifications(page, accessToken)
    const target = after.find((n) => n.id === unread.id)
    expect(target?.read_at, 'read_at is set after mark-read').toBeTruthy()
  })

  test('dismiss deletes the row', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)

    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByTestId('notifications-page')).toBeVisible()
    const before = await listNotifications(page, accessToken)
    expect(before.length).toBeGreaterThan(0)
    await page.getByTestId('notification-dismiss').first().click()
    await page.waitForTimeout(800)
    const after = await listNotifications(page, accessToken)
    expect(after.length).toBe(before.length - 1)
  })
})
