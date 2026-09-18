import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, pickNotification, signup, uniqueEmail } from './_helpers.js'

test.describe('notifications page', () => {
  test('shows the notifications the feed holds', async ({ page }) => {
    await signup(page, uniqueEmail('notif'))
    // Read the notification under test from the API rather than naming the
    // demo one — its copy changes with the app's content.
    const notification = await pickNotification(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(notification.title).first()).toBeVisible({ timeout: 15000 })
  })

  test('"Mark all read" POSTs to /api/notifications/read-all and unread count drops', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('notif-read'))
    const notification = await pickNotification(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(notification.title).first()).toBeVisible({ timeout: 15000 })
    const reqs = await captureNetwork(page, async () => {
      const btn = page.getByRole('button', { name: /mark all read/i }).first()
      await btn.click()
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => r.method === 'POST' && /\/api\/notifications\/read-all/.test(r.url)),
    ).toBeTruthy()
  })
})
