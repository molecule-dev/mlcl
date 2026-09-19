import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  listIncidents,
  listNotifications,
  signup,
  triggerIncident,
  uniqueEmail,
} from './_helpers.js'

test.describe('/notifications', () => {
  test('renders the in-app paging feed from the seed', async ({ page }) => {
    await signup(page, uniqueEmail('ntf-list'))
    const notifications = await listNotifications(page)
    expect(notifications.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1').first()).toBeVisible()
    expect(await page.locator('[data-mol-id^="activity-"]').count()).toBe(notifications.length)
  })

  test('mark-all-read clears the unread badge state', async ({ page }) => {
    await signup(page, uniqueEmail('ntf-readall'))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    const unread = (await listNotifications(page)).filter((n) => !n.read).length
    if (unread > 0) {
      await expect(page.locator('[data-mol-id="notifications-mark-all-read"]')).toBeEnabled()
      await page.locator('[data-mol-id="notifications-mark-all-read"]').click()
      await expect
        .poll(async () => (await listNotifications(page)).filter((n) => !n.read).length, {
          timeout: 15_000,
        })
        .toBe(0)
    }
  })

  test('triggering an incident writes a page notification', async ({ page }) => {
    await signup(page, uniqueEmail('ntf-page'))
    const created = await triggerIncident(page, {
      title: `E2E paging notification ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'critical',
    })
    const notifications = await listNotifications(page)
    const pageNotification = notifications.find((n) => n.kind === 'page')
    expect(pageNotification, 'trigger must page in-app').toBeTruthy()
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(
      page.locator('[data-mol-id^="activity-"]', { hasText: 'Page:' }).first(),
    ).toBeVisible()
    // The incident list also carries the new incident.
    expect((await listIncidents(page)).some((i) => i.id === created.id)).toBe(true)
  })
})
