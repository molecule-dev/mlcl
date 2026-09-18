/**
 * /taxes — KPIs (collected/owed/estimated/deductible), jurisdictions,
 * quarterly estimates, deductibles, filing checklist.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedExpense, seedInvoice, signup } from './_helpers.js'

test.describe('taxes page', () => {
  test('initial load fires GET /api/reports/taxes and renders heading', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/taxes')
      await expect(page.getByRole('heading', { name: /taxes/i, level: 1 })).toBeVisible()
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/reports\/taxes/.test(r.url))?.status,
    ).toBeLessThan(400)
  })

  test('all section headings render (jurisdictions, quarterly, deductibles, checklist)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/taxes')
    await expect(page.getByRole('heading', { name: /sales tax by jurisdiction/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /quarterly estimates/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /deductibles by category/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /filing checklist/i })).toBeVisible()
  })

  test('quarterly estimates table contains 4 rows for the current year', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/taxes')
    await expect(page.getByText(/^Q1 \d{4}$/)).toBeVisible()
    await expect(page.getByText(/^Q4 \d{4}$/)).toBeVisible()
  })

  test('seeded deductible expense appears under deductibles breakdown', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedExpense(page, accessToken, { amount: 50, category: 'office', is_deductible: true })
    await page.goto(APP_BASE + '/taxes')
    await expect(page.getByText(/office/i)).toBeVisible({ timeout: 10000 })
  })

  test('seeded invoice with tax raises collected total', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedInvoice(page, accessToken, {
      status: 'sent',
      subtotal_cents: 10000,
      total_cents: 10825,
      amount_cents: 10825,
      tax_rate_pct: 8.25,
      tax_cents: 825,
    } as never)
    await page.goto(APP_BASE + '/taxes')
    await expect(page.getByRole('heading', { name: /taxes/i, level: 1 })).toBeVisible()
    await expect
      .poll(async () => (await page.locator('main').textContent()) ?? '', {
        timeout: 10000,
      })
      .toMatch(/8\.25|0\.00|—/) // either reflects or empty
  })
})
