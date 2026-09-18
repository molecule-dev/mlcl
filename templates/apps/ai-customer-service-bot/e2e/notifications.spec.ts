import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/notifications', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('page fires GET /api/notifications on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    })
    const list = reqs.find((r) => /\/api\/notifications(?:\?|$)/.test(r.url) && r.method === 'GET')
    expect(list, 'GET /api/notifications should fire on load').toBeTruthy()
    expect(list!.status).toBeLessThan(300)
  })

  test('renders the page container', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-mol-id="page-notifications"]')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Mark all read is disabled when there are no unread notifications', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    // Fresh user → no notifications → button disabled.
    await expect(page.locator('[data-mol-id="notifications-mark-all"]')).toBeDisabled()
  })

  test('Quiet-hours checkbox toggles', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    const checkbox = page.locator('[data-mol-id="notifications-quiet-checkbox"]')
    await expect(checkbox).not.toBeChecked()
    await checkbox.check()
    await expect(checkbox).toBeChecked()
  })

  test('All filter chip is selectable', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await page.locator('[data-mol-id="notifications-filter-all"]').click()
    await expect(page.locator('[data-mol-id="notifications-filter-all"]')).toBeVisible()
  })

  test('Escalation filter chip is selectable', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await page.locator('[data-mol-id="notifications-filter-escalation"]').click()
    // A fresh user has no notifications → empty state visible after filter.
    await expect(page.locator('[data-mol-id="notifications-empty"]')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Mention filter chip is selectable', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await page.locator('[data-mol-id="notifications-filter-mention"]').click()
    await expect(page.locator('[data-mol-id="notifications-empty"]')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('renders the empty state for a fresh user (no notifications, no list)', async ({ page }) => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="notifications-empty"]')).toBeVisible({
      timeout: 10_000,
    })
  })
})
