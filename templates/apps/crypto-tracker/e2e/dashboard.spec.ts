import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { getHoldings, getMarkets, signup } from './_helpers'

test('signup → dashboard renders portfolio + markets + news', async ({ page }) => {
  await signup(page)
  // The movers table renders the head of /api/markets, so read the coins it
  // will show rather than naming the demo catalog's.
  const coins = await getMarkets(page)
  expect(coins.length, 'markets catalog has at least two coins').toBeGreaterThan(1)

  // Hero card shows total value
  await expect(page.getByText(/total portfolio value/i)).toBeVisible()
  const heroValue = page.locator('text=/\\$\\d+/').first()
  await expect(heroValue).toBeVisible()

  // Top movers table lists the catalog's leading coins
  await expect(page.getByRole('link', { name: coins[0]!.name }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: coins[1]!.name }).first()).toBeVisible()

  // News cards are present
  await expect(page.getByText(/latest signals/i)).toBeVisible()
})

test('dashboard portfolio_stats endpoint returns rich computed numbers, not zeros', async ({
  page,
}) => {
  await signup(page)
  // Expected totals come from /api/portfolio — the same rows the report sums —
  // instead of a threshold derived from how much the demo seed happens to hold.
  const holdings = await getHoldings(page)
  expect(holdings.length, 'portfolio has holdings to report on').toBeGreaterThan(0)
  // Use direct API call from the page context (cookies/headers already attached)
  const data = await page.evaluate(async () => {
    const r = await fetch('/api/reports/portfolio_stats')
    return r.json()
  })
  expect(data.asset_count).toBe(holdings.length)
  expect(data.total_value_usd).toBeGreaterThan(0)
  expect(data.cost_basis_usd).toBeGreaterThan(0)
  expect(typeof data.total_pnl_usd).toBe('number')
  expect(typeof data.total_pnl_pct).toBe('number')
  expect(data.total_pnl_usd).toBeCloseTo(data.total_value_usd - data.cost_basis_usd, 2)
})
