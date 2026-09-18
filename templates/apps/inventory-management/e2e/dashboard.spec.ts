import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authHeaders,
  API_BASE,
  captureNetwork,
  listProducts,
  listWarehouses,
  pickStockedProduct,
  primeDashboard,
  signup,
  totalUnitsAcrossWarehouses,
  uniqueEmail,
} from './_helpers.js'

test.describe('dashboard', () => {
  test('renders KPIs derived from the catalog after signup', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash'))
    expect(accessToken).toBeTruthy()
    const snap = await primeDashboard(page, accessToken)
    // Check each KPI against the same endpoints the app reads, so the spec
    // still holds once the demo catalog is replaced.
    const warehouses = await listWarehouses(page, accessToken)
    const products = await listProducts(page, accessToken)
    expect(snap.warehouses).toBe(warehouses.length)
    expect(snap.uniqueSkus).toBe(products.length)
    expect(snap.totalUnits).toBe(await totalUnitsAcrossWarehouses(page, accessToken, warehouses))
    expect(snap.alerts.length).toBeGreaterThanOrEqual(1)
    expect(snap.movements.length).toBeGreaterThanOrEqual(1)

    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /today across the fleet/i })).toBeVisible()
    // KPI cards visible with seeded values
    await expect(page.getByText(snap.uniqueSkus.toString(), { exact: true }).first()).toBeVisible()
  })

  test('snapshot computes per-product low/out across warehouses correctly', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-low'))
    const snap = await primeDashboard(page, accessToken)
    // Adjust one warehouse's stock so a global product goes truly out / low,
    // then re-fetch the snapshot and confirm KPIs reflect it. Which product is
    // read from the API — naming a seeded SKU breaks on a replaced catalog.
    const { product: target, stock } = await pickStockedProduct(page, accessToken)
    const totalBefore = stock.total_quantity
    expect(totalBefore).toBeGreaterThan(0)

    for (const lvl of stock.by_warehouse) {
      const adj = await page.request.post(`${API_BASE}/stock/adjust`, {
        headers: authHeaders(accessToken),
        data: {
          product_id: target.id,
          warehouse_id: lvl.warehouse_id,
          quantity_change: -Number(lvl.quantity),
          reason: 'test-zero',
        },
        failOnStatusCode: false,
      })
      expect(adj.status(), await adj.text().catch(() => '')).toBe(200)
    }

    const after = await primeDashboard(page, accessToken)
    expect(after.outOfStockCount).toBeGreaterThanOrEqual(snap.outOfStockCount + 1)
  })

  test('alerts list renders the seeded low-stock entries from snapshot', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-alerts'))
    const snap = await primeDashboard(page, accessToken)
    expect(snap.alerts.length).toBeGreaterThanOrEqual(1)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /today across the fleet/i })).toBeVisible({
      timeout: 15_000,
    })
    // Surface one of the alert SKUs in the rendered alert list
    await expect(page.getByText(snap.alerts[0].sku, { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('initial render issues GET /dashboard/snapshot', async ({ page }) => {
    await signup(page, uniqueEmail('dash-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await expect(page.getByRole('heading', { name: /today across the fleet/i })).toBeVisible({
        timeout: 15_000,
      })
    })
    const call = reqs.find((r) => /\/dashboard\/snapshot$/.test(r.url) && r.method === 'GET')
    expect(call?.status, 'GET /dashboard/snapshot returned 200').toBe(200)
  })
})
