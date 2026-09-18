import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { signup } from './_helpers'

test('transactions list shows seeded transactions with numeric amounts', async ({ page }) => {
  await signup(page)
  await page.goto('/transactions')
  await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible()

  // Backend returns numbers (not strings)
  const sample = await page.evaluate(async () => {
    const r = await fetch('/api/transactions')
    const d = await r.json()
    const list = Array.isArray(d) ? d : d.data || []
    return list[0]
  })
  expect(sample).toBeTruthy()
  expect(typeof sample.amount).toBe('number')
  expect(typeof sample.price_usd).toBe('number')
  expect(typeof sample.total_usd).toBe('number')
  expect(sample.amount).toBeGreaterThan(0)
})

test('log transaction modal POSTs to backend, row appears in list, persists across reload', async ({
  page,
}) => {
  await signup(page)
  await page.goto('/transactions')
  await page.getByTestId('transactions-log').click()
  const form = page.getByTestId('transactions-form')
  await expect(form).toBeVisible()

  await form.locator('select').selectOption('buy')
  await form.locator('input[type="text"]').first().fill('AVAX')
  await form.locator('input[type="number"]').first().fill('10')
  await form.locator('input[type="number"]').nth(1).fill('35.50')
  await form.locator('input[type="text"]').nth(1).fill('TestExchange')
  await form.getByRole('button', { name: /save transaction/i }).click()

  await expect(form).toBeHidden({ timeout: 8_000 })

  // UI shows it
  await expect(page.getByText(/AVAX/i).first()).toBeVisible()

  // Backend invariant
  const found = await page.evaluate(async () => {
    const r = await fetch('/api/transactions')
    const d = await r.json()
    const list = Array.isArray(d) ? d : d.data || []
    return list.find(
      (t: { symbol: string; exchange: string }) =>
        t.symbol === 'avax' && t.exchange === 'TestExchange',
    )
  })
  expect(found).toBeTruthy()
  expect(found.amount).toBe(10)

  // Reload — row still present (server-backed)
  await page.reload()
  await expect(page.getByText(/AVAX/i).first()).toBeVisible()
})
