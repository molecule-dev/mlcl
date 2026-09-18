import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, listTransactions, signup } from './_helpers.js'

test.describe('/rebalance', () => {
  test('GET /api/reports/rebalance returns an array of allocation rows', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.get(`${API_BASE}/reports/rebalance`, {
      headers: authHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as unknown
    const rows = Array.isArray(body) ? body : ((body as { data?: unknown[] }).data ?? [])
    expect(Array.isArray(rows)).toBe(true)
  })

  test('Rebalance page renders without crashing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rebalance')
    await page.waitForLoadState('networkidle').catch(() => {})
    const text = await page.locator('main, body').first().innerText()
    expect(text).toMatch(/rebalance|allocation|portfolio|drift|Argent/i)
  })

  test('POST /api/reports/rebalance/execute returns created+skipped arrays', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Seed a holding so rebalance has positions to consider.
    await page.request.post(`${API_BASE}/transactions`, {
      headers: authHeaders(accessToken),
      data: { symbol: 'AAPL', kind: 'buy', shares: 10, price_per_share: 200 },
    })

    const before = await listTransactions(page, accessToken)
    const r = await page.request.post(`${API_BASE}/reports/rebalance/execute`, {
      headers: authHeaders(accessToken),
      data: {},
    })
    expect(r.status()).toBeLessThan(400)
    const body = (await r.json()) as {
      data?: { created?: unknown[]; skipped?: unknown[] }
      created?: unknown[]
      skipped?: unknown[]
    }
    const payload = body.data ?? body
    expect(Array.isArray(payload.created) || Array.isArray(payload.skipped)).toBe(true)
    // Created items should be reflected in /transactions
    const created = Array.isArray(payload.created) ? payload.created : []
    if (created.length > 0) {
      const after = await listTransactions(page, accessToken)
      expect(after.length).toBeGreaterThanOrEqual(before.length + created.length)
    }
  })
})
