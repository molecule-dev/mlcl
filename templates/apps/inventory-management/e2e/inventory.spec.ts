import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  captureNetwork,
  pickCategory,
  pickSearchTerm,
  primeDashboard,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('inventory page', () => {
  test('lists SKUs and supports search/category filtering', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('inv-list'))
    await primeDashboard(page, accessToken) // ensure the catalog is populated
    // The search term and the category both come from the catalog the API
    // serves — the filter's options are built from those very rows.
    const { term, other } = await pickSearchTerm(page, accessToken)
    const category = await pickCategory(page, accessToken)

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/inventory')
      await expect(page.getByTestId('inventory-table')).toBeVisible({ timeout: 15_000 })
    })
    const productsCall = reqs.find((r) => /\/products(\?|$)/.test(r.url) && r.method === 'GET')
    expect(productsCall?.status, 'GET /products fired on inventory load').toBe(200)
    // Wait for the loading row to be replaced by real product rows.
    await expect
      .poll(async () => page.getByTestId('inventory-row').count(), { timeout: 15_000 })
      .toBeGreaterThan(0)

    await page.getByTestId('inventory-search').fill(term)
    await expect
      .poll(async () => page.getByTestId('inventory-row').count(), { timeout: 5_000 })
      .toBeGreaterThan(0)
    const rows = await page.getByTestId('inventory-row').allTextContents()
    expect(rows.every((r) => r.toLowerCase().includes(term.toLowerCase()))).toBeTruthy()
    // A product whose name/SKU/category does not hold the term must drop out.
    await expect(page.getByTestId('inventory-row').filter({ hasText: other.sku })).toHaveCount(0)

    await page.getByTestId('inventory-search').fill('')
    // The Inventory page uses native <select> for category filter.
    await page.getByRole('combobox').first().selectOption(category)
    await expect
      .poll(async () => page.getByTestId('inventory-row').count(), { timeout: 5_000 })
      .toBeGreaterThan(0)
    const categoryRows = await page.getByTestId('inventory-row').allTextContents()
    expect(categoryRows.every((r) => r.includes(category))).toBeTruthy()
  })

  test('Add SKU modal creates a new product visible in the list and persisted via API', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('inv-add'))
    await primeDashboard(page, accessToken)

    const sku = 'NEW-' + Date.now()
    await page.goto(APP_BASE + '/inventory')
    await page.getByTestId('add-sku-button').click()
    await page.locator('#add-sku-name').fill('Test Widget Pro')
    await page.locator('#add-sku-sku').fill(sku)
    await page.locator('#add-sku-category').fill('Hardware')
    await page.locator('#add-sku-cost').fill('15.50')
    await page.locator('#add-sku-sell').fill('29.00')
    await page.locator('#add-sku-threshold').fill('25')
    await page.getByRole('button', { name: /^create sku$/i }).click()

    // Use search to find the new SKU regardless of pagination position
    await expect(page.getByTestId('inventory-search')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('inventory-search').fill(sku)
    await expect(page.getByText(sku)).toBeVisible({ timeout: 10_000 })

    // Read-after-write via API
    const res = await page.request.get(`${API_BASE}/products?limit=200`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(200)
    const products = (await res.json()) as Array<{ sku: string; name: string }>
    const created = products.find((p) => p.sku === sku)
    expect(created, 'product persisted via API').toBeTruthy()
    expect(created!.name).toBe('Test Widget Pro')
  })

  test('rejects duplicate SKU with a 409', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('inv-dup'))
    await primeDashboard(page, accessToken)

    const sku = 'DUP-' + Date.now()
    const first = await page.request.post(`${API_BASE}/products`, {
      headers: authHeaders(accessToken),
      data: { name: 'First', sku, category: 'Tools' },
      failOnStatusCode: false,
    })
    expect(first.status()).toBe(201)

    const second = await page.request.post(`${API_BASE}/products`, {
      headers: authHeaders(accessToken),
      data: { name: 'Second', sku, category: 'Tools' },
      failOnStatusCode: false,
    })
    expect(second.status()).toBe(409)
  })

  test('Export CSV downloads a file with at least one product row', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('inv-csv'))
    await primeDashboard(page, accessToken)

    await page.goto(APP_BASE + '/inventory')
    await expect(page.getByTestId('inventory-table')).toBeVisible({ timeout: 15_000 })

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }),
      page.getByTestId('export-csv-button').click(),
    ])
    const path = await download.path()
    expect(path).toBeTruthy()
    const fs = await import('node:fs')
    const text = fs.readFileSync(path!, 'utf8')
    // header + at least one row
    const lines = text.split(/\r?\n/).filter(Boolean)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines[0]).toMatch(/sku/i)
  })
})
