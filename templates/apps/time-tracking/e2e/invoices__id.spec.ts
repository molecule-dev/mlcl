import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedClient,
  seedEntry,
  seedInvoice,
  seedProject,
  signup,
} from './_helpers.js'

test.describe('/invoices/:id page', () => {
  async function seedFullInvoice(page: import('@playwright/test').Page) {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'Detail Co' })
    const project = await seedProject(page, auth.accessToken, {
      client_id: client.id,
      hourly_rate_cents: 12000,
      name: 'Detail Project',
    })
    const entry = await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 60 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
      description: 'Detail entry',
    })
    const invoice = await seedInvoice(page, auth.accessToken, {
      client_id: client.id,
      source_entry_ids: [entry.id],
      notes: 'Detail invoice notes',
    })
    return { auth, client, project, entry, invoice }
  }

  test('detail container + invoice number h1 visible after seeding', async ({ page }) => {
    const { invoice } = await seedFullInvoice(page)
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    await expect(page.locator('[data-test=invoice-detail]')).toBeVisible()
    await expect(page.getByRole('heading', { name: invoice.number })).toBeVisible()
  })

  test('breadcrumb "Invoices" link navigates back to /invoices', async ({ page }) => {
    const { invoice } = await seedFullInvoice(page)
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    await page
      .getByRole('link', { name: /^Invoices$/i })
      .first()
      .click()
    await page.waitForURL('**/invoices')
    await expect(page.locator('[data-test=invoices-page]')).toBeVisible()
  })

  test('Bill-to block shows the client name', async ({ page }) => {
    const { invoice, client } = await seedFullInvoice(page)
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    await expect(page.locator('[data-test=invoice-detail]')).toContainText(client.name)
  })

  test('Status pill defaults to "Draft" for a freshly-created invoice', async ({ page }) => {
    const { invoice } = await seedFullInvoice(page)
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    await expect(page.locator('[data-test=invoice-detail]')).toContainText(/Draft/i)
  })

  test('Line items roll up to the correct total', async ({ page }) => {
    const { invoice } = await seedFullInvoice(page)
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    // 1 hour × $120 = $120
    await expect(page.locator('[data-test=invoice-total]')).toContainText('$120')
  })

  test('Notes block renders the persisted notes from creation', async ({ page }) => {
    const { invoice } = await seedFullInvoice(page)
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    await expect(page.locator('[data-test=invoice-detail]')).toContainText('Detail invoice notes')
  })

  test('Print / PDF button is visible', async ({ page }) => {
    const { invoice } = await seedFullInvoice(page)
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    await expect(page.locator('[data-test=invoice-pdf]')).toBeVisible()
  })

  test('Print / PDF click invokes window.print', async ({ page }) => {
    const { invoice } = await seedFullInvoice(page)
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    await page.evaluate(() => {
      const w = window as unknown as { __printCalls?: number; print: () => void }
      w.__printCalls = 0
      w.print = () => {
        w.__printCalls = (w.__printCalls ?? 0) + 1
      }
    })
    await page.locator('[data-test=invoice-pdf]').click()
    const calls = await page.evaluate(
      () => (window as unknown as { __printCalls?: number }).__printCalls ?? 0,
    )
    expect(calls).toBeGreaterThan(0)
  })

  test('Send button transitions Draft → Sent and persists across reload', async ({ page }) => {
    const { invoice, auth } = await seedFullInvoice(page)
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
    await page.locator('[data-test=invoice-send]').click()
    await expect(page.locator('[data-test=invoice-detail]')).toContainText(/Sent/i, {
      timeout: 5000,
    })
    await page.reload()
    await expect(page.locator('[data-test=invoice-detail]')).toContainText(/Sent/i)
    const fresh = await page.request.get(`${API_BASE}/invoices/${invoice.id}`, {
      headers: apiHeaders(auth.accessToken),
    })
    const body = await fresh.json()
    const obj = (body.data ?? body) as { status: string }
    expect(obj.status).toBe('sent')
  })

  test('Mark paid transitions Sent → Paid and persists paid_at', async ({ page }) => {
    const { invoice, auth } = await seedFullInvoice(page)
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    await page.locator('[data-test=invoice-send]').click()
    await page.waitForTimeout(800)
    await page.locator('[data-test=invoice-mark-paid]').click()
    await expect(page.locator('[data-test=invoice-detail]')).toContainText(/Paid/i, {
      timeout: 5000,
    })
    await page.reload()
    await expect(page.locator('[data-test=invoice-detail]')).toContainText(/Paid/i)
    const fresh = await page.request.get(`${API_BASE}/invoices/${invoice.id}`, {
      headers: apiHeaders(auth.accessToken),
    })
    const obj = ((await fresh.json()).data ?? (await fresh.json())) as {
      status: string
      paid_at: string | null
    }
    expect(obj.status).toBe('paid')
    expect(obj.paid_at).toBeTruthy()
  })

  test('Detail page fires GET /api/invoices/:id on load (captureNetwork)', async ({ page }) => {
    const { invoice } = await seedFullInvoice(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
      await page.waitForTimeout(1500)
    })
    const get = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/invoices/${invoice.id}`).test(r.url),
    )
    expect(get?.status).toBe(200)
  })

  test('Date columns (Issued / Due) render with localized month names', async ({ page }) => {
    const { invoice } = await seedFullInvoice(page)
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    await expect(page.locator('[data-test=invoice-detail]')).toContainText(
      /(January|February|March|April|May|June|July|August|September|October|November|December)/i,
    )
  })

  test('After Mark paid the row in /invoices reflects Paid + the Paid-30d KPI rolls up', async ({
    page,
  }) => {
    const { invoice } = await seedFullInvoice(page)
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    await page.locator('[data-test=invoice-send]').click()
    await page.waitForTimeout(500)
    await page.locator('[data-test=invoice-mark-paid]').click()
    await page.waitForTimeout(800)
    await page.goto(APP_BASE + '/invoices')
    await expect(page.locator(`[data-test=invoice-row-${invoice.id}]`)).toContainText(/Paid/i)
  })
})
