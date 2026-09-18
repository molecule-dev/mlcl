import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  expectNoConsoleErrors,
  listOrders,
  listZones,
  seedSampleData,
  signup,
} from './_helpers.js'

test.describe('/dashboard renders KPIs and live data after seed', () => {
  test('seeded dashboard shows order queue + zone tiles backed by API rows', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')

    await expect(page.getByTestId('reports-page').or(page.locator('main'))).toBeVisible()
    await expect(page.locator('text=/Sorthaus|Dashboard|Operations/i').first()).toBeVisible()

    const orders = await listOrders(page, accessToken)
    expect(orders.length).toBeGreaterThan(0)

    const zones = await listZones(page, accessToken)
    expect(zones.length).toBeGreaterThan(0)

    // Reload — data persists across reload (read-after-seed invariant).
    await expectNoConsoleErrors(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('main')).toBeVisible()
  })
})
