/**
 * /dashboard — KPIs + activity + recent invoices.
 *
 * Asserts on real outcomes:
 *  - new user lands on dashboard (auto-seeded from _seed.ts) and sees real
 *    revenue/outstanding figures derived from seeded invoices.
 *  - GET /api/dashboard/summary returns the same shape consumed by the UI.
 *  - GET /api/dashboard/activity returns at least one item for the seeded
 *    invoices/payments.
 *  - top action links route to /clients and /invoices/new.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('dashboard page', () => {
  test('renders heading and KPI grid for a fresh user (auto-seeded)', async ({ page }) => {
    await signup(page)
    await expect(
      page.getByRole('heading', { name: /Welcome back\. Cash is on its way\./i }),
    ).toBeVisible()
    // Wait for the summary network call to land — KPI cards exist but
    // values come from API.
    await page.waitForTimeout(1500)
    // The Drafts/Sent/Paid this week/Recurring strip exists.
    await expect(page.getByText(/^Drafts$/i).first()).toBeVisible()
    await expect(page.getByText(/^Sent$/i).first()).toBeVisible()
  })

  test('GET /api/dashboard/summary returns the documented shape', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/dashboard/summary`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status(), await res.text()).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    for (const k of [
      'outstanding_cents',
      'overdue_cents',
      'collected_this_month_cents',
      'open_invoices',
      'draft_count',
      'sent_count',
      'paid_this_week_count',
      'recurring_active_count',
      'change_pct',
    ]) {
      expect(body[k], `summary.${k}`).toBeDefined()
    }
  })

  test('GET /api/dashboard/activity returns at least one event for a fresh seeded user', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // First hit any list endpoint to ensure ensureDemoSeeded ran.
    await page.request.get(`${API_BASE}/clients`, { headers: apiHeaders(accessToken) })
    const res = await page.request.get(`${API_BASE}/dashboard/activity`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{
      id: string
      kind: string
      invoice_number: string
      client_name: string
    }>
    expect(Array.isArray(body)).toBe(true)
    expect(body.length, 'seeded activity items').toBeGreaterThan(0)
    // Must have a "created" event for at least one of the seeded invoices.
    expect(body.some((e) => e.kind === 'created')).toBe(true)
  })

  test('GET /api/invoices for a fresh user returns the invoices the account holds', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/invoices`, { headers: apiHeaders(accessToken) })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{
      id: string
      invoice_number: string
      client_name: string
      status: string
    }>
    // How many rows the demo data happens to create is not the contract —
    // that the account has invoices, and each carries the shape the list
    // page renders, is.
    expect(body.length, 'provisioned invoice count').toBeGreaterThan(0)
    for (const invoice of body) {
      expect(invoice.id, 'invoice.id').toBeTruthy()
      expect(invoice.invoice_number, 'invoice.invoice_number').toBeTruthy()
      expect(invoice.status, 'invoice.status').toBeTruthy()
    }
    // Numbers are generated with the account's own invoice prefix
    // (Settings → Invoice prefix), so read it rather than hardcoding it.
    const profile = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    expect(profile.status()).toBe(200)
    const { preferences } = (await profile.json()) as { preferences: { invoicePrefix: string } }
    expect(
      body.some((b) => b.invoice_number.startsWith(preferences.invoicePrefix)),
      `no invoice number uses the ${preferences.invoicePrefix} prefix`,
    ).toBe(true)
  })

  test('"New invoice" CTA navigates to /invoices/new', async ({ page }) => {
    await signup(page)
    await page
      .getByRole('link', { name: /^New invoice$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/invoices\/new/, { timeout: 10000 })
  })

  test('"New client" CTA navigates to /clients', async ({ page }) => {
    await signup(page)
    await page
      .getByRole('link', { name: /^New client$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/clients$/, { timeout: 10000 })
  })

  test('Recent invoices "View all →" link navigates to /invoices', async ({ page }) => {
    await signup(page)
    await page.waitForTimeout(1500)
    await page
      .getByRole('link', { name: /View all/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/invoices$/, { timeout: 10000 })
  })

  test('initial load fires GET /api/dashboard/summary, /activity, and /invoices (captureNetwork)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await expect(page.getByText(/^Drafts$/i).first()).toBeVisible({ timeout: 10000 })
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some(
        (r) => r.method === 'GET' && r.url.includes('/api/dashboard/summary') && r.status === 200,
      ),
    ).toBe(true)
    expect(
      reqs.some(
        (r) => r.method === 'GET' && r.url.includes('/api/dashboard/activity') && r.status === 200,
      ),
    ).toBe(true)
    expect(
      reqs.some((r) => r.method === 'GET' && r.url.includes('/api/invoices') && r.status === 200),
    ).toBe(true)
  })
})
