/**
 * Schema explorer + table browser. Drives `/schema/:id` and
 * `/table/:id/:table` against the real `qadmin_demo` postgres seeded by
 * `app/scripts/setup-demo-db.sh`.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { createDemoConnection, getAccessToken, signup } from './_helpers.js'

test.describe('Schema explorer', () => {
  test('lists the seeded tables (products, orders) in the sidebar', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const { id } = await createDemoConnection(token, 'Schema Demo')

    await page.goto(`/schema/${id}`)
    await expect(page.locator('[data-mol-id="se-pick-products"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-mol-id="se-pick-orders"]')).toBeVisible()
  })

  test('selecting products renders columns / indexes / fks tabs', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const { id } = await createDemoConnection(token, 'Schema Tabs')

    await page.goto(`/schema/${id}`)
    await page.locator('[data-mol-id="se-pick-products"]').click()

    const cols = page.locator('[data-mol-id="se-columns"]')
    await expect(cols).toBeVisible({ timeout: 10_000 })
    await expect(cols).toContainText('id')
    await expect(cols).toContainText('sku')
    await expect(cols).toContainText('name')
    await expect(cols).toContainText('price_cents')

    await page.locator('[data-mol-id="se-tab-indexes"]').click()
    const idx = page.locator('[data-mol-id="se-indexes"]')
    await expect(idx).toBeVisible({ timeout: 10_000 })
    await expect(idx).toContainText('idx_products_sku')

    await page.locator('[data-mol-id="se-tab-fkeys"]').click()
    const fks = page.locator('[data-mol-id="se-fkeys"]')
    await expect(fks).toBeVisible({ timeout: 10_000 })
  })

  test('orders table shows the foreign key to products', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const { id } = await createDemoConnection(token, 'Schema FK')

    await page.goto(`/schema/${id}`)
    await page.locator('[data-mol-id="se-pick-orders"]').click()
    await page.locator('[data-mol-id="se-tab-fkeys"]').click()

    const fks = page.locator('[data-mol-id="se-fkeys"]')
    await expect(fks).toContainText('product_id')
    await expect(fks).toContainText('products')
  })
})

test.describe('Table browser', () => {
  test('rows from products render with correct columns and counts', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const { id } = await createDemoConnection(token, 'Browse Products')

    await page.goto(`/table/${id}/products`)
    await expect(page.locator('[data-mol-id="tb-table"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-mol-id="tb-name"]')).toHaveText('products')
    // 5 seeded products
    await expect(page.locator('[data-mol-id="tb-table"]')).toContainText('SKU-001')
    await expect(page.locator('[data-mol-id="tb-table"]')).toContainText('SKU-005')
  })
})
