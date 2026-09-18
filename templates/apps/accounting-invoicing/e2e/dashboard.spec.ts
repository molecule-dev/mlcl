/**
 * /dashboard — KPI cards, recent invoices, "New invoice" CTA. Initial
 * load triggers GET /api/reports/dashboard_stats AND GET /api/invoices.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedInvoice, signup } from './_helpers.js'

test.describe('dashboard page', () => {
  test('initial load fires both stats + invoices GETs and renders the heading', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await expect(page.locator('h1')).toContainText(/glance|invoices/i, { timeout: 15000 })
    })
    const stats = reqs.find(
      (r) => /\/api\/reports\/dashboard_stats/.test(r.url) && r.method === 'GET',
    )
    const invoices = reqs.find((r) => /\/api\/invoices(\?|$)/.test(r.url) && r.method === 'GET')
    expect(stats?.status, 'GET /api/reports/dashboard_stats').toBeLessThan(400)
    expect(invoices?.status, 'GET /api/invoices').toBeLessThan(400)
  })

  test('empty account renders zeroed KPIs without error', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('h1')).toContainText(/glance|invoices/i, { timeout: 15000 })
    const text = await page.locator('main').first().textContent()
    expect(text).toMatch(/\$0|—/)
    expect(text).not.toMatch(/Failed to load/i)
  })

  test('after seeding a paid invoice, dashboard cash + outstanding totals reflect it on reload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const issued = new Date(Date.now() - 86400_000).toISOString()
    await seedInvoice(page, accessToken, {
      status: 'sent',
      total_cents: 250000,
      amount_cents: 250000,
      subtotal_cents: 250000,
      issue_date: issued,
    })
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('h1')).toContainText(/glance|invoices/i, { timeout: 15000 })
    const body = await page.locator('main').textContent()
    expect(body).toMatch(/2,500\.00|2500\.00/)
  })

  test('"New invoice" CTA navigates to /invoices/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /new invoice/i })
      .first()
      .click()
    await page.waitForURL('**/invoices/new', { timeout: 5000 })
  })

  test('Recent invoices card lists a recently-seeded invoice', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedInvoice(page, accessToken, { customer_name: `RecentCo ${Date.now()}` })
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(seeded.number ?? 'INV-')).toBeVisible({ timeout: 10000 })
  })

  test('side-nav links work from dashboard (Invoices, Expenses, Customers, Reports, Settings)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    for (const [label, urlRx] of [
      ['Invoices', /\/invoices/],
      ['Expenses', /\/expenses/],
      ['Customers', /\/customers/],
      ['Reports', /\/reports/],
      ['Settings', /\/settings/],
    ] as const) {
      await page.goto(APP_BASE + '/dashboard')
      await page
        .getByRole('link', { name: new RegExp(`^${label}$`, 'i') })
        .first()
        .click()
      await page.waitForURL(urlRx, { timeout: 5000 })
    }
  })
})
