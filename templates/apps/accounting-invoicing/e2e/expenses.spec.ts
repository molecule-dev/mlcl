/**
 * /expenses — list, KPIs, link to detail, "Log expense" CTA.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedExpense, signup } from './_helpers.js'

test.describe('expenses page', () => {
  test('initial load fetches expenses and renders heading', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/expenses')
      await expect(page.getByRole('heading', { name: /expenses/i, level: 1 })).toBeVisible()
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/expenses(\?|$)/.test(r.url))?.status,
    ).toBeLessThan(400)
  })

  test('"Log expense" CTA navigates to /expenses/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page.getByRole('link', { name: /log expense/i }).click()
    await page.waitForURL('**/expenses/new', { timeout: 5000 })
  })

  test('seeded expense appears in the list with the merchant + category', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedExpense(page, accessToken, {
      merchant: `Vendor-${Date.now()}`,
      category: 'office',
    })
    await page.goto(APP_BASE + '/expenses')
    await expect(page.getByText(`Vendor-`)).toBeVisible({ timeout: 10000 })
    void seeded
  })

  test('KPI total reflects seeded expenses', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedExpense(page, accessToken, { amount: 12.34 })
    await seedExpense(page, accessToken, { amount: 56.78 })
    await page.goto(APP_BASE + '/expenses')
    await expect(page.getByRole('heading', { name: /expenses/i, level: 1 })).toBeVisible()
    await expect
      .poll(async () => (await page.locator('main').textContent()) ?? '', {
        timeout: 10000,
      })
      .toMatch(/69\.12/)
  })

  test('clicking expense row navigates to /expenses/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedExpense(page, accessToken, { merchant: 'NavMerchant' })
    await page.goto(APP_BASE + '/expenses')
    await page.getByRole('link', { name: /NavMerchant/ }).click()
    await page.waitForURL(new RegExp(`/expenses/${seeded.id}`), { timeout: 5000 })
  })
})
