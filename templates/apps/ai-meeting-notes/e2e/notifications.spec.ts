import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

/**
 * Per-page spec for /notifications. Backed by GET /api/notifications.
 */

test.describe('notifications page', () => {
  test('notifications heading is visible', async ({ page }) => {
    await signup(page, uniqueEmail('notif-h'), 'TestPass123!')
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i }).first()).toBeVisible()
  })

  test('empty state is shown to a fresh user', async ({ page }) => {
    await signup(page, uniqueEmail('notif-empty'), 'TestPass123!')
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/no.*notifications|no new notifications/i).first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test('GET /api/notifications fires on page load', async ({ page }) => {
    await signup(page, uniqueEmail('notif-net'), 'TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    const getCall = reqs.find((r) => /\/api\/notifications(\?|$)/.test(r.url) && r.method === 'GET')
    expect(getCall, 'GET /api/notifications must fire').toBeTruthy()
    expect([200, 201]).toContain(getCall!.status)
  })

  test('sidebar nav-notifications chrome is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('notif-nav'), 'TestPass123!')
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-mol-id="nav-notifications"]').first()).toBeVisible()
  })
})
