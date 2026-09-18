import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { getHoldings, pickHolding, pickUnheldSymbol, signup } from './_helpers'

test('portfolio page lists the held coins with non-zero values', async ({ page }) => {
  await signup(page)
  // The holdings under test are read from /api/portfolio rather than named, so
  // the spec holds once the demo holdings are replaced.
  const holdings = await getHoldings(page)
  const holding = holdings[0]
  expect(holding, 'portfolio has at least one holding').toBeTruthy()
  await page.goto('/portfolio')
  await expect(page.getByRole('heading', { name: /^portfolio$/i })).toBeVisible()
  // Holdings table shows the held coin
  await expect(
    page.getByRole('link', { name: String(holding!.name ?? holding!.symbol) }),
  ).toBeVisible()
  // P/L numbers populated; one allocation cell per holding
  const allocCells = await page.locator('tbody tr td:last-child').allTextContents()
  expect(allocCells.length).toBe(holdings.length)
  // At least one allocation cell should contain a percentage > 0
  expect(allocCells.some((c) => /\d+\.\d+%/.test(c))).toBe(true)
})

test('add holding flow: form POST creates row, row appears in list, persists across reload', async ({
  page,
}) => {
  await signup(page)
  // A symbol the portfolio does not already hold, so this is a brand-new row.
  const symbol = await pickUnheldSymbol(page)
  await page.goto('/portfolio')
  await page.getByTestId('portfolio-add-holding').click()
  const form = page.getByTestId('portfolio-add-form')
  await expect(form).toBeVisible()

  await form.locator('input[type="text"]').fill(symbol.toUpperCase())
  await form.locator('input[type="number"]').first().fill('25')
  await form.locator('input[type="number"]').nth(1).fill('250')
  await form.getByRole('button', { name: /save holding/i }).click()

  // Modal closes and the new row appears
  await expect(page.locator('table').getByText(symbol, { exact: false })).toBeVisible({
    timeout: 8_000,
  })

  // Backend invariant — GET /api/portfolio includes the new symbol
  const symbols = await page.evaluate(async () => {
    const r = await fetch('/api/portfolio')
    const d = await r.json()
    return (Array.isArray(d) ? d : d.data || []).map((x: { symbol: string }) => x.symbol)
  })
  expect(symbols).toContain(symbol)

  // Reload — still there (server-backed)
  await page.reload()
  await expect(page.locator('table').getByText(symbol, { exact: false })).toBeVisible({
    timeout: 8_000,
  })
})

test('add holding for already-held symbol folds into existing position (no 500)', async ({
  page,
}) => {
  await signup(page)
  // Whichever coin the portfolio already holds — naming a seeded one would
  // stop this testing the fold once the demo holdings are replaced.
  const holding = await pickHolding(page)
  const symbol = holding.symbol
  const result = await page.evaluate(async (sym: string) => {
    const before = await fetch('/api/portfolio').then((r) => r.json())
    const beforeHeld = (Array.isArray(before) ? before : before.data || []).find(
      (x: { symbol: string }) => x.symbol === sym,
    )
    const r = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: sym, amount: 0.1, cost_basis_usd: 6800 }),
    })
    const after = await fetch('/api/portfolio').then((r) => r.json())
    const afterHeld = (Array.isArray(after) ? after : after.data || []).find(
      (x: { symbol: string }) => x.symbol === sym,
    )
    return {
      status: r.status,
      rowCount: (Array.isArray(after) ? after : after.data || []).length,
      beforeCount: (Array.isArray(before) ? before : before.data || []).length,
      beforeAmount: Number(beforeHeld?.amount ?? 0),
      afterAmount: Number(afterHeld?.amount ?? 0),
    }
  }, symbol)
  expect(result.status).toBeLessThan(400)
  expect(result.afterAmount).toBeGreaterThan(result.beforeAmount)
  // Folded, not duplicated.
  expect(result.rowCount).toBe(result.beforeCount)
})
