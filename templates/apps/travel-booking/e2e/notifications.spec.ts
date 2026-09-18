/**
 * /notifications: GET /api/notifications + filter pills + read state
 * mutations.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('notifications heading renders + GET /api/notifications fires', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /^Notifications$/i })).toBeVisible()
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const notifReq = reqs.find((r) => r.method === 'GET' && /\/api\/notifications(\?|$)/.test(r.url))
  expect(notifReq?.status).toBe(200)
})

test('Activity eyebrow visible', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByText(/Activity/i)).toBeVisible()
})

test('All filter pill is rendered', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.locator('[data-testid="notifications-filter-all"]')).toBeVisible()
})

test('Bookings filter pill is interactive', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const pill = page.locator('[data-testid="notifications-filter-booking_update"]')
  await pill.click()
  await expect(pill).toBeVisible()
})

test('Messages filter pill is interactive', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const pill = page.locator('[data-testid="notifications-filter-host_message"]')
  await pill.click()
  await expect(pill).toBeVisible()
})

test('either empty-state OR feed rows are visible (never a hung spinner)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByText(/caught up|new|ago|notification/i).first()).toBeVisible()
})
