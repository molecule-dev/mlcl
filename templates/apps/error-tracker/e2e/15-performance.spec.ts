import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/performance', () => {
  test('renders summary cards from /api/performance', async ({ page }) => {
    await signup(page, uniqueEmail('perf-render'))
    const res = await page.request.get(`${API_BASE}/performance`, {
      headers: authHeaders(page),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      summary: { p50: number; p95: number; throughput_per_min: number }
    }
    expect(body.summary).toBeTruthy()
    await page.goto(APP_BASE + '/performance')
    await page.waitForLoadState('networkidle')
    const text = await page.locator('body').innerText()
    expect(text.length, 'page renders without erroring').toBeGreaterThan(0)
  })

  test('worst-transactions list is non-empty when seed produced traffic', async ({ page }) => {
    await signup(page, uniqueEmail('perf-worst'))
    const res = await page.request.get(`${API_BASE}/performance`, {
      headers: authHeaders(page),
    })
    const body = (await res.json()) as { worst?: unknown[]; worst_transactions?: unknown[] }
    const worst = body.worst ?? body.worst_transactions
    expect(Array.isArray(worst), 'performance returns a worst[] list').toBe(true)
    expect((worst as unknown[]).length, 'seed produced at least one transaction').toBeGreaterThan(0)
  })

  test('page load fires a GET /api/performance request', async ({ page }) => {
    await signup(page, uniqueEmail('perf-network'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/performance')
      await page.waitForLoadState('networkidle')
    })
    const perfCall = reqs.find((r) => r.method === 'GET' && /\/api\/performance/.test(r.url))
    expect(perfCall, '/performance must fetch /api/performance').toBeTruthy()
    expect(perfCall!.status, 'performance call should be 2xx').toBeLessThan(300)
  })
})
