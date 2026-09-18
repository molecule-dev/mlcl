/**
 * /payments — list and KPIs (Received MTD / Pending / Refunded / Unmatched).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedPayment, signup } from './_helpers.js'

test.describe('payments page', () => {
  test('initial load fetches payments and renders heading', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/payments')
      await expect(page.getByRole('heading', { name: /payments/i, level: 1 })).toBeVisible()
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/payments(\?|$)/.test(r.url))?.status,
    ).toBeLessThan(400)
  })

  test('empty state renders "No payments yet."', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/payments')
    await expect(page.getByText(/no payments yet/i)).toBeVisible()
  })

  test('seeded payment appears with customer + amount', async ({ page }) => {
    const { accessToken } = await signup(page)
    const customerName = `Payer-${Date.now()}`
    await seedPayment(page, accessToken, { customer_name: customerName, amount_cents: 7777 })
    await page.goto(APP_BASE + '/payments')
    await expect(page.getByText(customerName)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/77\.77/).first()).toBeVisible()
  })

  test('KPI received total reflects seeded received payments', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedPayment(page, accessToken, { amount_cents: 1000 })
    await seedPayment(page, accessToken, { amount_cents: 2500 })
    await page.goto(APP_BASE + '/payments')
    // Wait for the loading state to clear (page is fetching /api/payments).
    await expect(page.getByText(/loading/i)).toBeHidden({ timeout: 15000 })
    await expect(page.locator('main')).toContainText(/35\.00/, { timeout: 15000 })
  })
})
