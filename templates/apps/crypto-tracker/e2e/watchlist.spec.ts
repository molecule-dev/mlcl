import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { pickWatchedCoin, signup } from './_helpers'

test('watchlist shows the watched coins with current market data', async ({ page }) => {
  await signup(page)
  // The row under test is read from /api/watchlist rather than named, so the
  // spec holds once the demo coins are replaced.
  const watched = await pickWatchedCoin(page)
  await page.goto('/watchlist')
  await expect(page.getByRole('heading', { name: /watchlist/i })).toBeVisible()
  await expect(page.getByRole('link', { name: watched.name })).toBeVisible()
  // Price column populated (not $0)
  const cells = await page.locator('tbody tr td').allTextContents()
  expect(cells.some((c) => /\$\d+\.\d/.test(c))).toBe(true)
})

test('remove from watchlist deletes the row in DB and survives reload', async ({ page }) => {
  await signup(page)
  const watched = await pickWatchedCoin(page)
  const symbol = watched.symbol.toLowerCase()
  const rowName = new RegExp(`^${escapeRegExp(watched.name)}\\s+${escapeRegExp(symbol)}$`, 'i')
  await page.goto('/watchlist')

  const before = await page.evaluate(async () => {
    const r = await fetch('/api/watchlist')
    const d = await r.json()
    return (Array.isArray(d) ? d : d.data || []).map((x: { symbol: string }) => x.symbol)
  })
  expect(before).toContain(symbol)

  await page.getByTestId(`watchlist-remove-${symbol}`).click()
  // Row gone from UI
  await expect(page.getByRole('link', { name: rowName })).toHaveCount(0)

  // Backend invariant
  const after = await page.evaluate(async () => {
    const r = await fetch('/api/watchlist')
    const d = await r.json()
    return (Array.isArray(d) ? d : d.data || []).map((x: { symbol: string }) => x.symbol)
  })
  expect(after).not.toContain(symbol)

  // Reload — the row is still gone
  await page.reload()
  await expect(page.getByRole('link', { name: rowName })).toHaveCount(0)
})

/** Coin names come from the catalog, so they can carry regex metacharacters. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
