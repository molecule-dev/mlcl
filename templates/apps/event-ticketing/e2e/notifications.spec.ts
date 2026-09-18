import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  seedEvent,
  seedOrder,
  seedTier,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/notifications page', () => {
  test('renders the Notifications h1', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('h1')).toContainText(/notifications/i)
  })

  test('All filter chip is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.getByRole('button', { name: /^all$/i }).first().click()
  })

  test('Unread filter chip is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page
      .getByRole('button', { name: /^unread$/i })
      .first()
      .click()
  })

  test('Purchases filter chip is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page
      .getByRole('button', { name: /^purchases$/i })
      .first()
      .click()
  })

  test('Mark all read button is clickable (no-op when empty)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const btn = page.getByRole('button', { name: /mark all read/i }).first()
    if (await btn.count()) await btn.click()
  })

  test('hits GET /api/notifications on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    const n = reqs.find((r) => r.method === 'GET' && /\/api\/notifications/.test(r.url))
    expect(n, 'GET /api/notifications').toBeTruthy()
    expect(n?.status).toBeLessThan(500)
  })
})
