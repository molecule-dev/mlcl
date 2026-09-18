import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, seedTransaction, signup } from './_helpers.js'

test.describe('/reports', () => {
  test('Reports page renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForLoadState('networkidle').catch(() => {})
    const text = await page.locator('main, body').first().innerText()
    expect(text.length).toBeGreaterThan(50)
    expect(text).toMatch(/report|tax|performance|allocation|holding/i)
  })

  test('GET /api/reports/summary returns a numeric summary', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.get(`${API_BASE}/reports/summary`, {
      headers: authHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as { total_value_cents?: number; data?: unknown }
    const summary = (body as { data?: { total_value_cents?: number } }).data ?? body
    expect(typeof summary.total_value_cents === 'number').toBe(true)
  })

  test('GET /api/reports/full returns aggregated report data', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedTransaction(page, accessToken, { symbol: 'AAPL' })
    const r = await page.request.get(`${API_BASE}/reports/full`, {
      headers: authHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
  })
})
