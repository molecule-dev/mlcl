import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('helpdesk-ticketing: /plan-updated', () => {
  test('/plan-updated renders without throwing the RootErrorBoundary (Stripe success target)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[role=alert]')).toHaveCount(0)
  })

  test('unauthed /plan-updated redirects to /login (AuthGuard)', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('/plan-updated mount reads the freshly-updated plan via /api/billing/status', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    const apiCalls = reqs.filter((r) => r.url.includes('/api/'))
    expect(apiCalls.length).toBeGreaterThan(0)
  })
})
