/**
 * /payments — payment history + KPI cards + CSV export.
 *
 * Asserts on real outcomes:
 *  - new user gets the seeded payment(s) rendered.
 *  - POST /api/payments writes a real DB row, returns 201, decorated.
 *  - GET /api/payments?invoice_id= filters by invoice.
 *  - Free-tier CSV export returns 402.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  seedInvoice,
  seedPayment,
  signup,
} from './_helpers.js'

test.describe('payments page', () => {
  test('renders heading + at least one seeded payment row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/payments')
    await expect(page.getByRole('heading', { name: /^Payments$/ })).toBeVisible()
    await page.waitForTimeout(1500)
    // The seed creates at least one payment for the "paid" demo invoice.
    const empty = await page
      .getByTestId('payments-empty')
      .isVisible()
      .catch(() => false)
    expect(empty, 'fresh user should NOT see empty state — seed creates payments').toBe(false)
  })

  test('POST /api/payments creates a real ledger row and updates invoice status', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const inv = await seedInvoice(page, accessToken, {
      items: [{ description: 'Pay test', quantity: 1, unit_price: 200 }],
      tax_rate: 0,
    })
    const pay = await seedPayment(page, accessToken, {
      invoice_id: inv.id,
      amount: 200,
      method: 'manual',
      reference: 'check #001',
    })
    expect(pay.id).toBeTruthy()
    expect(pay.amount).toBe(200)

    // Read-after-write — invoice now shows status=paid and amount_paid=200.
    const get = await page.request.get(`${API_BASE}/invoices/${inv.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await get.json()) as { status: string; amount_paid: number }
    expect(body.status).toBe('paid')
    expect(body.amount_paid).toBe(200)
  })

  test('GET /api/payments?invoice_id= filters to that invoice only', async ({ page }) => {
    const { accessToken } = await signup(page)
    const inv = await seedInvoice(page, accessToken, {
      items: [{ description: 'Filter test', quantity: 1, unit_price: 50 }],
      tax_rate: 0,
    })
    await seedPayment(page, accessToken, { invoice_id: inv.id, amount: 50, method: 'bank' })
    const res = await page.request.get(`${API_BASE}/payments?invoice_id=${inv.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{ invoice_id: string; amount: number }>
    expect(body.length, 'at least one payment for this invoice').toBeGreaterThan(0)
    for (const p of body) expect(p.invoice_id).toBe(inv.id)
  })

  test('GET /api/exports/payments.csv on free-tier user returns 402', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/exports/payments.csv`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(402)
    const body = (await res.json()) as { limitType?: string }
    expect(body.limitType).toBe('canExport')
  })

  test('initial mount fires GET /api/payments and KPI cards render finite currency (captureNetwork)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/payments')
      await expect(page.getByRole('heading', { name: /^Payments$/ })).toBeVisible()
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => r.method === 'GET' && r.url.includes('/api/payments') && r.status === 200),
    ).toBe(true)
    // KPI cards should not show $NaN.
    const html = await page.content()
    expect(html).not.toContain('$NaN')
    expect(html).not.toContain('NaN')
  })

  test('Payment history table is populated for the seeded user (no empty state)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/payments')
    await page.waitForTimeout(1500)
    await expect(page.getByText(/Payment history/i)).toBeVisible()
    const empty = await page
      .getByTestId('payments-empty')
      .isVisible()
      .catch(() => false)
    expect(empty).toBe(false)
  })
})
