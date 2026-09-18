/**
 * /expenses/:id — detail view (header, transaction details, receipt panel,
 * audit trail), back link.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedExpense, signup } from './_helpers.js'

test.describe('expense detail page', () => {
  test('loads expense on mount and shows merchant + amount', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedExpense(page, accessToken, {
      merchant: 'DetailMerchant',
      amount: 49.99,
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/expenses/${seeded.id}`)
      await expect(page.getByRole('heading', { name: 'DetailMerchant', level: 1 })).toBeVisible()
    })
    expect(
      reqs.find((r) => r.method === 'GET' && new RegExp(`/api/expenses/${seeded.id}$`).test(r.url))
        ?.status,
    ).toBeLessThan(400)
    const body = await page.locator('main').textContent()
    expect(body).toMatch(/49\.99/)
  })

  test('back link returns to /expenses', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedExpense(page, accessToken)
    await page.goto(APP_BASE + `/expenses/${seeded.id}`)
    await page.getByRole('link', { name: /^← Expenses$/i }).click()
    await page.waitForURL('**/expenses', { timeout: 5000 })
  })

  test('Receipt panel shows "No receipt attached" placeholder when none uploaded', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedExpense(page, accessToken)
    await page.goto(APP_BASE + `/expenses/${seeded.id}`)
    await expect(page.getByText(/no receipt attached/i)).toBeVisible()
  })

  test('non-existent id renders the missing-expense placeholder', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/00000000-0000-0000-0000-000000000000')
    await expect(page.getByRole('heading', { name: /Expense record unavailable/i })).toBeVisible({
      timeout: 10000,
    })
  })
})
