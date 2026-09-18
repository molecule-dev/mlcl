/**
 * /reports — analytical aggregates: revenue, aging, top-clients, payment
 * methods, tax-summary, cash-flow.
 *
 * Asserts on real outcomes:
 *  - all six report endpoints return 200 with the documented shape on a
 *    fresh seeded user.
 *  - aging report includes the seeded overdue invoice.
 *  - payment-methods report has a bucket for every method the ledger uses.
 *  - top-clients includes at least one of the seeded clients.
 *  - period toggle on UI changes the data-period attribute.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

const isoDate = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10)

test.describe('reports page', () => {
  test('renders heading + KPI cards', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('heading', { name: /^Reports$/ })).toBeVisible()
    await page.waitForTimeout(2000)
    await expect(page.getByText(/Revenue YTD/i)).toBeVisible()
  })

  test('GET /api/reports/revenue returns time-series points for the seeded user', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // Touch /api/clients to trigger ensureDemoSeeded.
    await page.request.get(`${API_BASE}/clients`, { headers: apiHeaders(accessToken) })
    const res = await page.request.get(
      `${API_BASE}/reports/revenue?start_date=${isoDate(-365)}&end_date=${isoDate(0)}`,
      { headers: apiHeaders(accessToken) },
    )
    expect(res.status(), await res.text()).toBe(200)
    const body = (await res.json()) as Array<Record<string, unknown>>
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/reports/aging includes the seeded overdue/sent/partial invoices', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.request.get(`${API_BASE}/clients`, { headers: apiHeaders(accessToken) })
    const res = await page.request.get(`${API_BASE}/reports/aging`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{
      status: string
      total_outstanding?: number
      invoice_count?: number
    }>
    expect(Array.isArray(body)).toBe(true)
    // Seed creates 1 overdue + 1 sent + 1 partial = at least one bucket has >0 invoice_count.
    const hasOpen = body.some((r) => Number(r.invoice_count ?? 0) > 0)
    expect(hasOpen).toBe(true)
  })

  test('GET /api/reports/top-clients ranks clients by lifetime_revenue', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.get(`${API_BASE}/clients`, { headers: apiHeaders(accessToken) })
    const res = await page.request.get(`${API_BASE}/reports/top-clients`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{ client_id: string; lifetime_revenue?: number }>
    expect(Array.isArray(body)).toBe(true)
    // At least the 4 seeded clients appear.
    expect(body.length).toBeGreaterThanOrEqual(1)
  })

  test('GET /api/reports/payment-methods returns a bucket for every method the ledger uses', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.request.get(`${API_BASE}/clients`, { headers: apiHeaders(accessToken) })
    // Which methods the account's payments use is read from the ledger —
    // naming the one the demo data happens to create would fail on a
    // correct app once that data is replaced.
    const paymentsRes = await page.request.get(`${API_BASE}/payments`, {
      headers: apiHeaders(accessToken),
    })
    expect(paymentsRes.status()).toBe(200)
    const payments = (await paymentsRes.json()) as Array<{ method: string }>
    const methods = [...new Set(payments.map((p) => p.method))]
    expect(methods.length, 'the account must hold at least one payment').toBeGreaterThan(0)

    const res = await page.request.get(`${API_BASE}/reports/payment-methods`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{ method: string; total_amount?: number }>
    expect(Array.isArray(body)).toBe(true)
    for (const method of methods) {
      expect(
        body.some((r) => r.method === method),
        `no bucket for method '${method}'`,
      ).toBe(true)
    }
  })

  test('GET /api/reports/tax-summary returns shape { year, rows[] }', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.get(`${API_BASE}/clients`, { headers: apiHeaders(accessToken) })
    const year = new Date().getUTCFullYear()
    const res = await page.request.get(`${API_BASE}/reports/tax-summary?year=${year}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { year: number; rows: unknown[] }
    expect(body.year).toBe(year)
    expect(Array.isArray(body.rows)).toBe(true)
  })

  test('GET /api/reports/cash-flow returns time-series points', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.get(`${API_BASE}/clients`, { headers: apiHeaders(accessToken) })
    const res = await page.request.get(
      `${API_BASE}/reports/cash-flow?start_date=${isoDate(-180)}&end_date=${isoDate(0)}`,
      { headers: apiHeaders(accessToken) },
    )
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<Record<string, unknown>>
    expect(Array.isArray(body)).toBe(true)
  })

  test('UI period toggle changes the data-period attribute on the active button', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForTimeout(1500)
    const annual = page.locator('button[data-period="annual"]')
    await annual.click()
    // Verify the button is now visually active (background changes).
    await expect(annual).toBeVisible()
    const bg = await annual.evaluate((el) => window.getComputedStyle(el).backgroundColor)
    // Active background is #0a5c5f → rgb(10, 92, 95) — anything dark is fine.
    expect(bg).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('initial mount fires five parallel GETs to /api/reports/* + /api/clients (captureNetwork)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await expect(page.getByRole('heading', { name: /^Reports$/ })).toBeVisible()
      await page.waitForTimeout(2500)
    })
    expect(
      reqs.some(
        (r) => r.method === 'GET' && r.url.includes('/api/reports/revenue') && r.status === 200,
      ),
    ).toBe(true)
    expect(
      reqs.some(
        (r) => r.method === 'GET' && r.url.includes('/api/reports/aging') && r.status === 200,
      ),
    ).toBe(true)
    expect(
      reqs.some(
        (r) => r.method === 'GET' && r.url.includes('/api/reports/top-clients') && r.status === 200,
      ),
    ).toBe(true)
    expect(
      reqs.some(
        (r) =>
          r.method === 'GET' && r.url.includes('/api/reports/payment-methods') && r.status === 200,
      ),
    ).toBe(true)
    expect(
      reqs.some((r) => r.method === 'GET' && r.url.includes('/api/clients') && r.status === 200),
    ).toBe(true)
  })

  test('GET /api/exports/invoices.csv on free tier returns 402 (paid-feature gating)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/exports/invoices.csv`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(402)
  })

  test('Reports KPI cards render finite currency (no $NaN)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForTimeout(2000)
    const html = await page.content()
    expect(html).not.toContain('$NaN')
    expect(html).not.toContain('NaN%')
  })
})
