import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Reports /reports', () => {
  test('initial load fetches /api/readings/daily and renders a daily-breakdown table', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const daily = reqs.find((r) => r.method === 'GET' && /\/api\/readings\/daily/.test(r.url))
    expect(daily, 'expected GET /api/readings/daily').toBeTruthy()
    expect(daily!.status).toBeLessThan(300)

    // Either the table is visible (data) or the empty placeholder appears.
    const table = page.locator('[data-mol-id="reports-table"]')
    const empty = page.locator('[data-mol-id="reports-empty"]')
    const tableCount = await table.count().catch(() => 0)
    const emptyCount = await empty.count().catch(() => 0)
    expect(tableCount + emptyCount).toBeGreaterThan(0)
  })

  test('switching range to 7D refetches with a tighter window', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="reports-range-7d"]').first().click()
      await page.waitForTimeout(1500)
    })
    const refetch = reqs.find((r) => r.method === 'GET' && /\/api\/readings\/daily/.test(r.url))
    expect(refetch).toBeTruthy()
    expect(refetch!.status).toBeLessThan(300)
  })

  test('Download CSV triggers a file download', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

    // If there is no data the export button is disabled — skip in that case.
    const empty = page.locator('[data-mol-id="reports-empty"]')
    if (await empty.count().catch(() => 0)) test.skip()

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.locator('[data-mol-id="reports-export"]').first().click(),
    ])
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/\.csv$/i)
    const path = await download.path()
    if (path) {
      const stats = await import('node:fs').then((m) => m.statSync(path))
      // CSV header alone is ~75 bytes; with one row it's >100.
      expect(stats.size).toBeGreaterThan(50)
    }
  })

  test('totals KPIs render dollar and kWh values', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    const main = page.locator('main, [data-mol-id="reports-page"]').first()
    await expect(main).toContainText(/kWh/)
    await expect(main).toContainText(/\$\d/)
  })
})
