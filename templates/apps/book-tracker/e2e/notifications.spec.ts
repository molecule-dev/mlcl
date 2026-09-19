/**
 * /notifications — fetches /api/notifications, exposes a "Mark all read"
 * button. A fresh signup typically has no notifications, so we focus on
 * the GET happening and the empty-state copy.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('notifications page calls /api/notifications', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.find((r) => /\/api\/notifications$/.test(r.url) && r.method === 'GET')?.status).toBe(
    200,
  )
})

test('mark-all-read button is disabled when no unread notifications', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('notifications-mark-all')).toBeDisabled({ timeout: 10_000 })
})

test('notifications heading is visible', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.locator('h1')).toContainText(/notifications/i, { timeout: 10_000 })
})
