import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('helpdesk-ticketing: /notifications', () => {
  test('/notifications renders without throwing the RootErrorBoundary', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[role=alert]')).toHaveCount(0)
  })

  test('unauthed /notifications redirects to /login (AuthGuard)', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/notifications')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('/notifications mount issues at least one /api/* GET (captureNetwork)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    const apiCalls = reqs.filter((r) => r.url.includes('/api/'))
    expect(apiCalls.length).toBeGreaterThan(0)
  })
})
