/**
 * /notifications — surfaces messages where the signed-in user has been
 * @-mentioned. We assert on the empty state for a brand-new user, on the
 * populated state after seeding a mention, and on the heading + load.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiSignupAndPrime,
  authHeaders,
  seedChannel,
  uniqueEmail,
} from './_helpers.js'

test.describe('notifications page', () => {
  test('renders the Notifications heading', async ({ page }) => {
    await apiSignupAndPrime(page, uniqueEmail('notif-render'), 'TestPass123!', 'Mentioner')
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible()
  })

  test('shows the empty-state copy for a brand-new user with no mentions', async ({ page }) => {
    await apiSignupAndPrime(page, uniqueEmail('notif-empty'), 'TestPass123!', 'Empty Inbox')
    await page.goto(APP_BASE + '/notifications')
    const empty = page.locator('[data-mol-id="notifications-empty"]')
    await expect(empty).toBeVisible({ timeout: 5000 })
  })

  test('renders mention rows when a message contains @firstName', async ({ page }) => {
    const { accessToken, name } = await apiSignupAndPrime(
      page,
      uniqueEmail('notif-pop'),
      'TestPass123!',
      'Carol Tester',
    )
    const handle = (name.split(' ')[0] || '').toLowerCase()
    const ch = await seedChannel(page, accessToken, { name: 'qa-mentions' })
    await page.request.post(`${API_BASE}/messages`, {
      headers: authHeaders(accessToken),
      data: { channel_id: ch.id, content: `hey @${handle} can you review?` },
    })
    await page.goto(APP_BASE + '/notifications')
    const list = page.locator('[data-mol-id="notifications-list"]')
    await expect(list).toBeVisible({ timeout: 5000 })
    await expect(list).toContainText(/review/i)
  })
})
