/**
 * /invoices — list, status filters, summary stats, search, link to detail.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedInvoice, signup } from './_helpers.js'

test.describe('invoices page', () => {
  test('initial load fetches invoices and renders heading', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/invoices')
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/invoices/i)
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/invoices(\?|$)/.test(r.url))?.status,
    ).toBeLessThan(400)
  })

  test('"New invoice" CTA navigates to /invoices/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await page.getByRole('link', { name: /new invoice/i }).click()
    await page.waitForURL('**/invoices/new', { timeout: 5000 })
  })

  test('seeded invoice shows up in list with auto-generated number', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedInvoice(page, accessToken, { status: 'sent' })
    expect(seeded.number).toMatch(/^INV-\d{4}$/)
    await page.goto(APP_BASE + '/invoices')
    await expect(page.getByText(seeded.number ?? '')).toBeVisible({ timeout: 10000 })
  })

  test('status filter chips reduce list to matching status', async ({ page }) => {
    const { accessToken } = await signup(page)
    const draft = await seedInvoice(page, accessToken, {
      status: 'draft',
      customer_name: 'DraftCo',
    })
    const paid = await seedInvoice(page, accessToken, { status: 'paid', customer_name: 'PaidCo' })
    await page.goto(APP_BASE + '/invoices')
    await page.getByRole('button', { name: /^paid/i }).click()
    await expect(page.getByText('PaidCo')).toBeVisible()
    await expect(page.getByText('DraftCo')).not.toBeVisible()
    await page.getByRole('button', { name: /^draft/i }).click()
    await expect(page.getByText('DraftCo')).toBeVisible()
    await expect(page.getByText('PaidCo')).not.toBeVisible()
    await page.getByRole('button', { name: /^all/i }).click()
    await expect(page.getByText('PaidCo')).toBeVisible()
    await expect(page.getByText('DraftCo')).toBeVisible()
    void draft
    void paid
  })

  test('search filters by invoice number or customer', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedInvoice(page, accessToken, { customer_name: `AlphaSearch ${Date.now()}` })
    await seedInvoice(page, accessToken, { customer_name: `BetaSearch ${Date.now()}` })
    await page.goto(APP_BASE + '/invoices')
    await page.getByPlaceholder(/Search invoice/i).fill('Alpha')
    await expect(page.getByText(/AlphaSearch/)).toBeVisible()
    await expect(page.getByText(/BetaSearch/)).not.toBeVisible()
  })

  test('clicking the invoice number navigates to detail', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedInvoice(page, accessToken)
    await page.goto(APP_BASE + '/invoices')
    await page.getByRole('link', { name: seeded.number ?? /INV-/ }).click()
    await page.waitForURL(new RegExp(`/invoices/${seeded.id}`), { timeout: 5000 })
  })

  test('summary stats reflect outstanding/paid totals', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedInvoice(page, accessToken, {
      status: 'sent',
      total_cents: 10000,
      amount_cents: 10000,
    })
    await seedInvoice(page, accessToken, { status: 'paid', total_cents: 5000, amount_cents: 5000 })
    await page.goto(APP_BASE + '/invoices')
    await expect(page.getByText(/Outstanding/i)).toBeVisible()
    const text = await page.locator('main').textContent()
    expect(text).toMatch(/100\.00/)
    expect(text).toMatch(/50\.00/)
  })
})
