import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { getMarkets, pickCoin, pickUnwatchedCoin, signup } from './_helpers'

test('markets list shows every catalog coin with price + 24h change', async ({ page }) => {
  await signup(page)
  // Read the catalog from the endpoint the page reads, so the spec holds
  // after the demo coins are replaced.
  const coins = await getMarkets(page)
  expect(coins.length, 'markets catalog is populated').toBeGreaterThan(0)
  await page.goto('/markets')
  await expect(page.getByRole('link', { name: coins[0]!.name }).first()).toBeVisible()
  // Numeric price column populated (no $0.00) — one row per catalog coin.
  const priceCells = await page.locator('tbody tr td:nth-child(3)').allTextContents()
  expect(priceCells.length).toBe(coins.length)
  const firstRow = priceCells[0]
  expect(firstRow).toMatch(/\$\d/)
  expect(firstRow).not.toMatch(/^\$0\.00$/)
})

test('coin detail page (by symbol) loads a catalog coin with stats and history', async ({
  page,
}) => {
  await signup(page)
  const coin = await pickCoin(page)
  await page.goto(`/coin/${coin.symbol}`)
  await expect(page.getByRole('heading', { name: coin.name })).toBeVisible()
  await expect(page.getByText(/key stats/i)).toBeVisible()
  // Market cap shown
  await expect(page.getByText(/market cap/i).first()).toBeVisible()
  // History chart svg present
  await expect(page.locator('svg').first()).toBeVisible()
})

test('coin detail "Watch" toggle adds AND removes from watchlist (persists across reload)', async ({
  page,
}) => {
  await signup(page)
  // A catalog coin that is NOT already on the watchlist, so we can prove
  // "add to watchlist" actually changes state whatever the catalog holds.
  const coin = await pickUnwatchedCoin(page)
  const symbol = coin.symbol.toLowerCase()
  await page.goto(`/coin/${coin.symbol}`)
  const btn = page.getByTestId('coin-detail-watch-toggle')
  await expect(btn).toBeVisible()

  // Initially shows "Watch"
  await expect(btn).toContainText(/watch/i)
  await btn.click()
  await expect(btn).toContainText(/watching/i, { timeout: 8_000 })

  // Verify backend state
  const after = await page.evaluate(async () => {
    const r = await fetch('/api/watchlist')
    const d = await r.json()
    return (Array.isArray(d) ? d : d.data || []).map((x: { symbol: string }) => x.symbol)
  })
  expect(after).toContain(symbol)

  // Reload — should still be watching
  await page.reload()
  await expect(page.getByTestId('coin-detail-watch-toggle')).toContainText(/watching/i, {
    timeout: 8_000,
  })

  // Untoggle
  await page.getByTestId('coin-detail-watch-toggle').click()
  await expect(page.getByTestId('coin-detail-watch-toggle')).toContainText(/^star\s*Watch$/i, {
    timeout: 8_000,
  })
  const final = await page.evaluate(async () => {
    const r = await fetch('/api/watchlist')
    const d = await r.json()
    return (Array.isArray(d) ? d : d.data || []).map((x: { symbol: string }) => x.symbol)
  })
  expect(final).not.toContain(symbol)
})
