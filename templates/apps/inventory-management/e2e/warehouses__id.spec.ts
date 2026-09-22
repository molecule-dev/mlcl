import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  captureNetwork,
  primeDashboard,
  signup,
  uniqueEmail,
} from './_helpers.js'

interface ApiWarehouse {
  id: string
  name: string
  code: string
  capacity?: number | null
  city?: string | null
  country?: string | null
}

interface ApiWarehouseDetail extends ApiWarehouse {
  total_items: number
  unique_products: number
  stock_levels: Array<{ product_id: string; warehouse_id: string; quantity: number }>
}

test.describe('warehouse detail page', () => {
  test('renders header (name + code + city/country) from real API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('wh-detail-header'))
    await primeDashboard(page, accessToken)
    const list = await page.request
      .get(`${API_BASE}/warehouses`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiWarehouse[]>)
    // Whichever warehouse the API returns first — naming a seeded one breaks
    // the spec the moment the demo warehouses are replaced.
    const target = list[0]
    await page.goto(APP_BASE + `/warehouses/${target.id}`)
    await expect(page.getByTestId('warehouse-detail-name')).toHaveText(target.name, {
      timeout: 15_000,
    })
    if (target.city || target.country) {
      const subtitle = [target.city, target.country].filter(Boolean).join(' · ')
      await expect(page.getByText(subtitle)).toBeVisible()
    }
  })

  test('back link navigates to /warehouses', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('wh-back'))
    await primeDashboard(page, accessToken)
    const list = await page.request
      .get(`${API_BASE}/warehouses`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiWarehouse[]>)
    await page.goto(APP_BASE + `/warehouses/${list[0].id}`)
    await page
      .getByRole('link', { name: /All warehouses/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/warehouses$/)
  })

  test('KPI cards (utilization / SKUs / units / status) reflect the API payload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('wh-kpis'))
    await primeDashboard(page, accessToken)
    const list = await page.request
      .get(`${API_BASE}/warehouses`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiWarehouse[]>)
    const target = list.find((w) => Number(w.capacity) > 0) ?? list[0]
    const detail = await page.request
      .get(`${API_BASE}/warehouses/${target.id}`, {
        headers: authHeaders(accessToken),
      })
      .then((r) => r.json() as Promise<ApiWarehouseDetail>)
    await page.goto(APP_BASE + `/warehouses/${target.id}`)
    await expect(page.getByTestId('warehouse-detail')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('warehouse-skus-kpi')).toContainText(
      String(detail.unique_products),
    )
    await expect(page.getByTestId('warehouse-units-kpi')).toContainText(
      Number(detail.total_items).toLocaleString(),
    )
    if (detail.capacity && detail.capacity > 0) {
      const utilPct = Math.round(
        Math.min(1, Number(detail.total_items) / Number(detail.capacity)) * 100,
      )
      await expect(page.getByTestId('warehouse-utilization-kpi')).toContainText(`${utilPct}%`)
    }
  })

  test('SKUs section renders one row per stock level and links each row to /products/:id', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('wh-skus'))
    await primeDashboard(page, accessToken)
    const list = await page.request
      .get(`${API_BASE}/warehouses`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiWarehouse[]>)
    const target = list[0]
    const detail = await page.request
      .get(`${API_BASE}/warehouses/${target.id}`, {
        headers: authHeaders(accessToken),
      })
      .then((r) => r.json() as Promise<ApiWarehouseDetail>)
    await page.goto(APP_BASE + `/warehouses/${target.id}`)
    await expect(page.getByTestId('warehouse-detail')).toBeVisible({ timeout: 15_000 })
    if (detail.stock_levels.length > 0) {
      const rows = page.getByTestId('warehouse-stock-row')
      await expect.poll(() => rows.count()).toBe(detail.stock_levels.length)
      // Each row should link to its product detail page
      const firstProdId = String(detail.stock_levels[0].product_id)
      await expect(page.locator(`a[href="/products/${firstProdId}"]`).first()).toBeVisible()
    } else {
      await expect(page.getByTestId('warehouse-detail-empty-stock')).toBeVisible()
    }
  })

  test('action buttons (Move stock + Edit SKUs) link to /transfers and /inventory', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('wh-actions'))
    await primeDashboard(page, accessToken)
    const list = await page.request
      .get(`${API_BASE}/warehouses`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiWarehouse[]>)
    await page.goto(APP_BASE + `/warehouses/${list[0].id}`)
    await expect(page.getByTestId('warehouse-detail')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: /Move stock/i })).toHaveAttribute(
      'href',
      '/transfers',
    )
    await expect(page.getByRole('link', { name: /Edit SKUs/i })).toHaveAttribute(
      'href',
      '/inventory',
    )
  })

  test('non-existent warehouse renders the error state with a back link', async ({ page }) => {
    // The missing warehouse 404s from the API — the rejected fetch IS the
    // error-state contract under test, so allow its expected console error.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await signup(page, uniqueEmail('wh-404'))
    await page.goto(APP_BASE + `/warehouses/00000000-0000-0000-0000-000000000000`)
    await expect(page.getByTestId('warehouse-detail-error')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: /All warehouses/i })).toBeVisible()
  })

  test('issues GET /warehouses/:id and GET /products on initial load', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('wh-network'))
    await primeDashboard(page, accessToken)
    const list = await page.request
      .get(`${API_BASE}/warehouses`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiWarehouse[]>)
    const target = list[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/warehouses/${target.id}`)
      await expect(page.getByTestId('warehouse-detail')).toBeVisible({ timeout: 15_000 })
    })
    const whCall = reqs.find(
      (r) => r.url.endsWith(`/warehouses/${target.id}`) && r.method === 'GET',
    )
    const prodCall = reqs.find((r) => /\/products\?limit=/.test(r.url) && r.method === 'GET')
    expect(whCall?.status).toBe(200)
    expect(prodCall?.status).toBe(200)
  })
})
