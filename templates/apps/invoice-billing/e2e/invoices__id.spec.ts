/**
 * /invoices/:id — single invoice view + actions.
 *
 * Asserts on real outcomes:
 *  - "Send invoice" flips status from draft → sent and sets sent_at.
 *  - "Mark as paid" creates a real payment row and flips invoice → paid.
 *  - "Duplicate" creates a NEW invoice with status=draft and a fresh number.
 *  - "Void" flips status to void.
 *  - GET /api/invoices/:id/pdf returns a real downloadable artifact (HTML
 *    body with attachment header — sandbox-safe stand-in for true PDF).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedInvoice, signup } from './_helpers.js'

test.describe('invoice detail page', () => {
  test('renders the seeded invoice with real client + total', async ({ page }) => {
    const { accessToken } = await signup(page)
    const inv = await seedInvoice(page, accessToken, {
      items: [{ description: 'Detail probe', quantity: 1, unit_price: 1234 }],
      tax_rate: 0,
    })
    await page.goto(APP_BASE + '/invoices/' + inv.id)
    await page.waitForTimeout(1500)
    await expect(page.getByTestId('invoice-number')).toContainText(inv.invoice_number)
    await expect(page.getByTestId('invoice-total')).toContainText(/\$1,234\.00/)
  })

  test('"Send invoice" persists status=sent + sent_at (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const inv = await seedInvoice(page, accessToken)
    await page.goto(APP_BASE + '/invoices/' + inv.id)
    await page.waitForTimeout(1200)

    await page.locator('[data-action="send-invoice"]').click()
    await expect(page.getByTestId('invoice-feedback')).toBeVisible({ timeout: 8000 })

    const get = await page.request.get(`${API_BASE}/invoices/${inv.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(get.status()).toBe(200)
    const body = (await get.json()) as { status: string; sent_at: string | null }
    expect(body.status).toBe('sent')
    expect(body.sent_at, 'sent_at populated').toBeTruthy()
  })

  test('"Mark as paid" records a real payment and flips invoice → paid', async ({ page }) => {
    const { accessToken } = await signup(page)
    const inv = await seedInvoice(page, accessToken, {
      items: [{ description: 'Pay flow', quantity: 1, unit_price: 250 }],
      tax_rate: 0,
    })
    await page.goto(APP_BASE + '/invoices/' + inv.id)
    await page.waitForTimeout(1500)

    await page.locator('[data-action="record-payment"]').click()
    await expect(page.getByTestId('invoice-feedback')).toBeVisible({ timeout: 8000 })

    const get = await page.request.get(`${API_BASE}/invoices/${inv.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await get.json()) as { status: string; amount_paid: number }
    expect(body.status).toBe('paid')
    expect(body.amount_paid).toBeCloseTo(inv.total, 2)

    const pays = await page.request.get(`${API_BASE}/payments?invoice_id=${inv.id}`, {
      headers: apiHeaders(accessToken),
    })
    const list = (await pays.json()) as Array<{ amount: number; status: string }>
    expect(list.length).toBeGreaterThan(0)
    expect(list[0].status).toBe('completed')
  })

  test('"Duplicate" creates a NEW invoice with a different id and a fresh number, status=draft', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const inv = await seedInvoice(page, accessToken)
    // Direct API to avoid UI flakiness — proves the contract.
    const dup = await page.request.post(`${API_BASE}/invoices/${inv.id}/duplicate`, {
      headers: apiHeaders(accessToken),
      data: {},
    })
    expect(dup.status(), await dup.text()).toBe(201)
    const body = (await dup.json()) as { id: string; status: string; invoice_number: string }
    expect(body.id).not.toBe(inv.id)
    expect(body.status).toBe('draft')
    expect(body.invoice_number).not.toBe(inv.invoice_number)

    // UI trigger also navigates to the new invoice page.
    await page.goto(APP_BASE + '/invoices/' + inv.id)
    await page.waitForTimeout(1200)
    const responsePromise = page.waitForResponse(
      (r) => /\/api\/invoices\/[\w-]+\/duplicate$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15000 },
    )
    await page.locator('[data-action="duplicate-invoice"]').click()
    const resp = await responsePromise
    expect(resp.status()).toBe(201)
  })

  test('"Void" flips status to void via /api/invoices/:id/void', async ({ page }) => {
    const { accessToken } = await signup(page)
    const inv = await seedInvoice(page, accessToken)
    await page.goto(APP_BASE + '/invoices/' + inv.id)
    await page.waitForTimeout(1200)

    await page.locator('[data-action="void-invoice"]').click()
    await expect(page.getByTestId('invoice-feedback')).toBeVisible({ timeout: 8000 })

    const get = await page.request.get(`${API_BASE}/invoices/${inv.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await get.json()) as { status: string }
    expect(body.status).toBe('void')
  })

  test('GET /api/invoices/:id/pdf returns a real attachment with invoice number in body', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const inv = await seedInvoice(page, accessToken)
    const pdf = await page.request.get(`${API_BASE}/invoices/${inv.id}/pdf`, {
      headers: apiHeaders(accessToken),
    })
    expect(pdf.status()).toBe(200)
    const cd = pdf.headers()['content-disposition'] ?? ''
    expect(cd).toMatch(/attachment/i)
    const text = await pdf.text()
    expect(text).toContain(inv.invoice_number)
    expect(text.length).toBeGreaterThan(500)
  })

  test('initial mount fires three GETs (invoice, client, payments) — captureNetwork', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const inv = await seedInvoice(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/invoices/' + inv.id)
      await expect(page.getByTestId('invoice-number')).toBeVisible({ timeout: 10000 })
      await page.waitForTimeout(800)
    })
    expect(
      reqs.some(
        (r) => r.method === 'GET' && r.url.includes(`/api/invoices/${inv.id}`) && r.status === 200,
      ),
    ).toBe(true)
    expect(
      reqs.some((r) => r.method === 'GET' && r.url.includes('/api/clients/') && r.status === 200),
    ).toBe(true)
    expect(
      reqs.some(
        (r) =>
          r.method === 'GET' &&
          r.url.includes('/api/payments') &&
          r.url.includes('invoice_id=') &&
          r.status === 200,
      ),
    ).toBe(true)
  })

  test('"Back to invoices" link returns to /invoices list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const inv = await seedInvoice(page, accessToken)
    await page.goto(APP_BASE + '/invoices/' + inv.id)
    await expect(page.getByTestId('invoice-number')).toBeVisible({ timeout: 10000 })
    await page.getByRole('link', { name: /Back to invoices/i }).click()
    await expect(page).toHaveURL(/\/invoices$/)
  })
})
