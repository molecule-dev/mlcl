import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  listInventory,
  listOrders,
  listZones,
  seedSampleData,
  signup,
} from './_helpers.js'

test.describe('/scan auto-detects orders, SKUs, zones', () => {
  test('scanning a known SO-# navigates to /orders/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    const orders = await listOrders(page, accessToken)
    const target = orders.find((o) => (o.externalOrderId ?? '').startsWith('SO-'))
    test.skip(!target, 'no seeded SO-# order')
    if (!target) return

    await page.goto(APP_BASE + '/scan')
    await expect(page.getByTestId('scanner-page')).toBeVisible()
    await page.getByTestId('scanner-input').fill(target.externalOrderId!)
    await page.getByTestId('scanner-submit').click()
    await page.waitForURL(`**/orders/${target.id}`, { timeout: 10000 })
  })

  test('scanning a known SKU navigates to /inventory/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    const inventory = await listInventory(page, accessToken)
    const target = inventory[0]
    test.skip(!target?.sku, 'no seeded SKU')
    if (!target?.sku) return

    await page.goto(APP_BASE + '/scan')
    await expect(page.getByTestId('scanner-page')).toBeVisible()
    await page.getByTestId('scanner-input').fill(target.sku)
    await page.getByTestId('scanner-submit').click()
    await page.waitForURL(`**/inventory/${target.id}`, { timeout: 10000 })
  })

  test('scanning a known zone code navigates to /locations', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    const zones = await listZones(page, accessToken)
    const target = zones.find((z) => !!z.code)
    test.skip(!target, 'no zone with a code')
    if (!target?.code) return

    await page.goto(APP_BASE + '/scan')
    await expect(page.getByTestId('scanner-page')).toBeVisible()
    await page.getByTestId('scanner-input').fill(target.code)
    await page.getByTestId('scanner-submit').click()
    await page.waitForURL('**/locations', { timeout: 10000 })
  })

  test('scanning unknown code surfaces an error message', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    await page.goto(APP_BASE + '/scan')
    await page.getByTestId('scanner-input').fill('SO-DEFINITELY-NOT-A-THING-XYZ')
    await page.getByTestId('scanner-submit').click()
    await expect(page.getByTestId('scanner-error')).toBeVisible({ timeout: 8000 })
  })
})
