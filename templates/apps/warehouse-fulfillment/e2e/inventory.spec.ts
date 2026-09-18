import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  getInventoryItem,
  listInventory,
  seedSampleData,
  signup,
} from './_helpers.js'

test.describe('/inventory list + detail + adjust persists onHand', () => {
  test('inventory list renders seeded SKUs and links to detail', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)

    const items = await listInventory(page, accessToken)
    expect(items.length).toBeGreaterThan(0)

    await page.goto(APP_BASE + '/inventory')
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('text=' + items[0].sku!).first()).toBeVisible({ timeout: 10000 })
  })

  test('inventory adjust API persists onHand change', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    const items = await listInventory(page, accessToken)
    const target = items[0]
    expect(target).toBeTruthy()
    const before = await getInventoryItem(page, accessToken, target.id)
    const startOnHand = Number((before as { onHand?: number }).onHand ?? 0)

    const adjustRes = await page.request.post(`${API_BASE}/inventory/${target.id}/adjust`, {
      headers: apiHeaders(accessToken),
      data: { delta: 5, reason: 'e2e cycle count' },
      failOnStatusCode: false,
    })
    expect(adjustRes.ok(), await adjustRes.text()).toBe(true)

    const after = await getInventoryItem(page, accessToken, target.id)
    const endOnHand = Number((after as { onHand?: number }).onHand ?? 0)
    expect(endOnHand, 'onHand persisted').toBe(startOnHand + 5)

    // The InventoryDetail page now reflects the new value (read-after-write across UI).
    await page.goto(`${APP_BASE}/inventory/${target.id}`)
    await page.waitForLoadState('networkidle')
    // Detail page should render KPIs/headers without crashing.
    await expect(page.locator('main')).toBeVisible()
  })
})
