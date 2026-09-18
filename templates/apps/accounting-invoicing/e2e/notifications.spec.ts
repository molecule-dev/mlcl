/**
 * /notifications — feed list. Empty state renders "No new notifications."
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('notifications page', () => {
  test('initial load fires GET /api/notifications and renders heading', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await expect(page.getByRole('heading', { name: /notifications/i, level: 1 })).toBeVisible()
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/notifications(\?|$)/.test(r.url))?.status,
    ).toBeLessThan(400)
  })

  test('fresh user sees the empty state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/no new notifications/i)).toBeVisible()
  })

  test('side-nav Notifications link routes to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .locator('nav')
      .getByRole('link', { name: /^notifications$/i })
      .first()
      .click()
    await page.waitForURL('**/notifications', { timeout: 5000 })
  })
})
