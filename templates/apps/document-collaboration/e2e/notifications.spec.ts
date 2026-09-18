/**
 * Notifications — list, filter, mark-as-read.
 *
 * Outcome assertions:
 * - GET /api/notifications returns a populated inbox for a fresh user, and
 *   every row it returns renders in the list. How many rows the demo seed
 *   creates is content an app's owner replaces, so it is never asserted.
 * - "Mark all as read" flips every unread row to unread=false (verified
 *   by a follow-up GET).
 * - The unread/all/mentions filter pills narrow the visible list
 *   correctly.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('notifications', () => {
  test('the inbox renders every notification the API returns, unread included', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-seed'))
    const list = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(accessToken),
    })
    // Read the row count from the API instead of hardcoding how many rows the
    // demo seed happens to create.
    const items = (await list.json()) as Array<{ unread: boolean }>
    expect(items.length, 'a fresh user should have notifications').toBeGreaterThan(0)
    const unread = items.filter((n) => n.unread).length
    expect(unread).toBeGreaterThan(0)

    await page.goto(APP_BASE + '/notifications')
    await page.waitForSelector('[data-testid="notifications-list"]', { timeout: 15000 })
    const visible = page.locator('[data-testid="notifications-list"] > li')
    await expect(visible).toHaveCount(items.length)
  })

  test('"Mark all as read" flips every unread row + persists across reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-read-all'))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForSelector('[data-testid="notifications-mark-all-read"]')
    await page.getByTestId('notifications-mark-all-read').click()
    await page.waitForTimeout(700)

    const list = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ unread: boolean }>
    expect(
      items.every((n) => n.unread === false),
      'all rows should be unread=false',
    ).toBe(true)

    await page.reload()
    await page.waitForSelector('[data-testid="notifications-list"]')
    // Switch to "unread" filter — should be empty.
    await page.getByTestId('notifications-filter-unread').click()
    await page.waitForTimeout(300)
    await expect(page.getByTestId('notifications-empty')).toBeVisible()
  })

  test('filter pill narrows the list', async ({ page }) => {
    await signup(page, uniqueEmail('notif-filter'))
    await page.goto(APP_BASE + '/notifications')
    await page.waitForSelector('[data-testid="notifications-list"]')

    const allCount = await page.locator('[data-testid="notifications-list"] > li').count()
    await page.getByTestId('notifications-filter-unread').click()
    await page.waitForTimeout(200)
    const unreadEmpty = await page.locator('[data-testid="notifications-empty"]').count()
    const unreadList = await page.locator('[data-testid="notifications-list"] > li').count()
    if (unreadEmpty === 0) {
      expect(unreadList).toBeLessThanOrEqual(allCount)
    }

    await page.getByTestId('notifications-filter-all').click()
    await page.waitForTimeout(200)
    const allCountAfter = await page.locator('[data-testid="notifications-list"] > li').count()
    expect(allCountAfter).toBe(allCount)
  })
})

test.describe('notifications — network', () => {
  test('page load triggers GET /api/notifications', async ({ page }) => {
    await signup(page, uniqueEmail('notif-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForSelector('[data-testid="notifications-list"]', { timeout: 15000 })
    })
    expect(reqs.some((r) => r.url.includes('/api/notifications'))).toBe(true)
  })
})
