/**
 * /reports — P&L, expense breakdown, cash flow, balance sheet, Export CSV.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedExpense, seedInvoice, signup } from './_helpers.js'

test.describe('reports page', () => {
  test('initial load fetches /api/reports/full and renders heading', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await expect(page.getByRole('heading', { name: /reports/i, level: 1 })).toBeVisible()
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/reports\/full/.test(r.url))?.status,
    ).toBeLessThan(400)
  })

  test('all four section headings render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('heading', { name: /profit & loss/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /expense breakdown/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /cash flow/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /balance sheet/i })).toBeVisible()
  })

  test('Export CSV triggers a download with real fields and flips label to "Exported"', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // seed enough data to make the report non-empty
    await seedExpense(page, accessToken, { amount: 12 })
    await seedInvoice(page, accessToken, {
      status: 'paid',
      total_cents: 5000,
      amount_cents: 5000,
      subtotal_cents: 5000,
    })
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('heading', { name: /reports/i, level: 1 })).toBeVisible()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export csv/i }).click(),
    ])
    const path = await download.path()
    const fs = await import('node:fs')
    const text = fs.readFileSync(path!, 'utf8')
    expect(text).toContain('section,month,revenue_cents,expenses_cents')
    expect(text).toContain('balance_sheet,')
    await expect(page.getByRole('button', { name: /exported/i })).toBeVisible()
  })

  test('seeded expense affects expense_breakdown row in the report', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedExpense(page, accessToken, { amount: 33.33, category: 'office' })
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByText(/office/i)).toBeVisible({ timeout: 10000 })
    const text = await page.locator('main').textContent()
    expect(text).toMatch(/33\.33/)
  })
})
