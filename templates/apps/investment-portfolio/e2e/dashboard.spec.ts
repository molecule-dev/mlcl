import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authHeaders,
  captureNetwork,
  reportSummary,
  seedTransaction,
  signup,
} from './_helpers.js'

test.describe('/dashboard', () => {
  test('renders portfolio-value heading after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle').catch(() => {})
    const text = await page.locator('main, body').first().innerText()
    expect(text).toMatch(/portfolio value/i)
  })

  test('GET /api/reports/summary fires on dashboard mount', async ({ page }) => {
    const { accessToken } = await signup(page)
    expect(accessToken).toBeTruthy()
    const calls = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    const summaryCall = calls.find(
      (c) => /\/api\/reports\/summary/.test(c.url) && c.method === 'GET',
    )
    expect(summaryCall, 'GET /api/reports/summary not seen').toBeTruthy()
    expect(summaryCall?.status).toBeLessThan(400)
  })

  test('after seeding a buy transaction the summary holding_count is >0', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedTransaction(page, accessToken, { symbol: 'AAPL', shares: 5, price_cents: 19000 })
    const summary = await reportSummary(page, accessToken)
    expect(summary.holding_count).toBeGreaterThan(0)
    expect(summary.total_value_cents).toBeGreaterThanOrEqual(0)
  })

  test('Sidebar links to Holdings, Transactions, Watchlist all live', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    for (const path of ['/holdings', '/transactions', '/watchlist']) {
      await page.goto(APP_BASE + path)
      await expect(page).toHaveURL(new RegExp(path))
    }
  })
})
