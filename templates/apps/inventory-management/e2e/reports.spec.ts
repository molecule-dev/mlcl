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

test.describe('reports', () => {
  test('summary returns KPIs and arrays for charts', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('rep-sum'))
    await primeDashboard(page, accessToken)

    const res = await page.request.get(`${API_BASE}/reports/summary`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      kpis: { turnoverLtm: number; daysOnHand: number; valuationDollars: number }
      turnoverTrend: Array<{ label: string; value: number }>
      aging: Array<{ bucket: string; value: number }>
      topValue: Array<{ sku: string; value: number }>
      totals: { totalUnits: number; uniqueSkus: number }
    }
    expect(body.kpis.valuationDollars).toBeGreaterThan(0)
    expect(body.turnoverTrend.length).toBeGreaterThan(0)
    expect(body.aging.length).toBe(4)
    expect(body.topValue.length).toBeGreaterThan(0)
    expect(body.totals.uniqueSkus).toBeGreaterThan(0)
  })

  test('valuation includes per-product cost/sell rows scoped to user', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('rep-val'))
    await primeDashboard(page, accessToken)

    const res = await page.request.get(`${API_BASE}/reports/valuation`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      total_cost_value: number
      total_sell_value: number
      items: Array<{ sku: string; quantity: number; cost_price: number }>
    }
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.total_cost_value).toBeGreaterThan(0)
    expect(body.total_sell_value).toBeGreaterThan(body.total_cost_value)
  })

  test('export/stock returns a CSV with proper headers + body', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('rep-csv'))
    await primeDashboard(page, accessToken)

    const res = await page.request.get(`${API_BASE}/reports/export/stock`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toMatch(/text\/csv/)
    expect(res.headers()['content-disposition']).toMatch(/attachment/)
    const body = await res.text()
    const lines = body.split('\n').filter(Boolean)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines[0]).toMatch(/sku.*name.*warehouse_id.*quantity/)
  })

  test('Reports page renders KPIs sourced from real data', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('rep-page'))
    await primeDashboard(page, accessToken)

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible({
        timeout: 15_000,
      })
    })
    const summary = reqs.find((r) => /\/reports\/summary/.test(r.url) && r.method === 'GET')
    expect(summary?.status, 'GET /reports/summary fired on page load').toBe(200)
  })
})
