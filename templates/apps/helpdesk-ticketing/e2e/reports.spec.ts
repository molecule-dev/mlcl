import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('helpdesk-ticketing: /reports', () => {
  test('/reports renders without throwing the RootErrorBoundary', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[role=alert]')).toHaveCount(0)
  })

  test('/reports mount fans out to /api/tickets', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => r.url.includes('/api/tickets'))).toBe(true)
  })

  test('/reports KPI tiles render without falling back to NaN', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForLoadState('networkidle')
    const html = await page.content()
    expect(/\bNaN\b/.test(html)).toBe(false)
  })
})
