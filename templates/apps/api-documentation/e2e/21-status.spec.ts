import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /status — fetches /api/reports/status. Empty services list shows the
// "All services nominal" message; otherwise renders rows.

test.describe('/status', () => {
  test('GET /api/reports/status fires and returns 200', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/status')
      await page.getByRole('heading', { name: /API status/i }).waitFor({ timeout: 15_000 })
    })
    const call = reqs.find((r) => /\/api\/reports\/status(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/reports/status should fire').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('overall status pill is visible (operational by default)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/status')
    await expect(
      page.getByText(/^(Operational|Degraded performance|Partial outage|Major outage)$/).first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('subtitle visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/status')
    await expect(page.getByText(/Real-time status/i)).toBeVisible({ timeout: 15_000 })
  })
})
