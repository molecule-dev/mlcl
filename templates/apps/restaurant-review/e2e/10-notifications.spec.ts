/**
 * Notifications — every signed-in user lazily gets a welcome notification
 * (lazy-seeded by the API on first read), and "Mark all as read" actually
 * flips the unread state.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test('A new account has at least one welcome notification', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.locator('[data-testid="notifications-list"] li').first()).toBeVisible({
    timeout: 8000,
  })
})

test('Mark all as read marks every notification as read', async ({ page }) => {
  await signup(page)
  // Trigger lazy seed.
  await apiRequest(page, 'GET', '/api/notifications')
  await page.goto(APP_BASE + '/notifications')
  await expect(page.locator('[data-testid="notifications-list"] li').first()).toBeVisible({
    timeout: 8000,
  })
  await page.locator('[data-testid="notifications-mark-all"]').click()
  await expect
    .poll(
      async () => {
        const r = await apiRequest<{ data: Array<{ read_at?: string | null; read?: boolean }> }>(
          page,
          'GET',
          '/api/notifications',
        )
        return r.body.data.every((n) => n.read === true || n.read_at !== null)
      },
      { timeout: 8000 },
    )
    .toBe(true)
})

test('Notifications mount fires GET /api/notifications and PATCH on mark-all', async ({ page }) => {
  await signup(page)
  await apiRequest(page, 'GET', '/api/notifications')
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/notifications')
    await page.locator('[data-testid="notifications-list"] li').first().waitFor({ timeout: 10000 })
    await page.locator('[data-testid="notifications-mark-all"]').click()
    await page.waitForTimeout(500)
  })
  const getCall = reqs.find((r) => /\/api\/notifications(\?|$)/.test(r.url) && r.method === 'GET')
  const patchCall = reqs.find(
    (r) => /\/api\/notifications\/mark-all-read/.test(r.url) && r.method === 'PATCH',
  )
  expect(getCall, 'GET /api/notifications must fire on mount').toBeTruthy()
  expect(patchCall, 'PATCH /api/notifications/mark-all-read must fire on click').toBeTruthy()
})

test('Notifications eyebrow + mark-all button are reachable', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.locator('[data-testid="notifications-eyebrow"]')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('[data-testid="notifications-mark-all"]')).toBeVisible({
    timeout: 8000,
  })
})
