import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedClient,
  seedEntry,
  seedProject,
  signup,
} from './_helpers.js'

test.describe('05: invoices — auto-roll-up, status transitions, persistence', () => {
  test('invoices page root + h1 visible after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await expect(page.locator('[data-test="invoices-page"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /^invoices$/i })).toBeVisible()
  })

  test('KPI card "Outstanding" renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await expect(page.locator('text=/outstanding/i').first()).toBeVisible()
  })

  test('KPI card "Overdue" renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await expect(page.locator('text=/overdue/i').first()).toBeVisible()
  })

  test('KPI card "Paid · last 30d" renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await expect(page.locator('text=/paid/i').first()).toBeVisible()
  })

  test('KPI card "Drafts" renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await expect(page.locator('text=/drafts/i').first()).toBeVisible()
  })

  test('"New invoice" toggle reveals the create form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await page.locator('[data-test=new-invoice-toggle]').click()
    await expect(page.locator('[data-test=new-invoice-form]')).toBeVisible()
  })

  test('invoice-client combobox is rendered after toggle', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await page.locator('[data-test=new-invoice-toggle]').click()
    await expect(page.locator('[data-test=invoice-client]')).toBeVisible()
  })

  test('invoice-due date input accepts a value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await page.locator('[data-test=new-invoice-toggle]').click()
    await page.locator('[data-test=invoice-due]').fill('2026-12-31')
    await expect(page.locator('[data-test=invoice-due]')).toHaveValue('2026-12-31')
  })

  test('invoice-notes textarea accepts typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await page.locator('[data-test=new-invoice-toggle]').click()
    await page.locator('[data-test=invoice-notes]').fill('Net-30 terms — thanks!')
    await expect(page.locator('[data-test=invoice-notes]')).toHaveValue('Net-30 terms — thanks!')
  })

  test('invoice-submit button is visible inside the form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/invoices')
    await page.locator('[data-test=new-invoice-toggle]').click()
    await expect(page.locator('[data-test=invoice-submit]')).toBeVisible()
  })

  test('invoice-row link navigates to /invoices/:id', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, {
      name: 'RowNav',
      hourly_rate_cents: 10000,
    })
    const project = await seedProject(page, auth.accessToken, {
      name: 'RowNav-P',
      client_id: client.id,
      hourly_rate_cents: 12000,
    })
    const entry = await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 60 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
    })
    const invRes = await page.request.post(`${API_BASE}/invoices`, {
      headers: apiHeaders(auth.accessToken),
      data: { client_id: client.id, source_entry_ids: [entry.id] },
    })
    const inv = (await invRes.json()).data ?? (await invRes.json())
    await page.goto(APP_BASE + '/invoices')
    await page.waitForLoadState('domcontentloaded')
    await page.locator(`[data-test="invoice-row-${inv.id}"]`).click()
    await page.waitForURL(`**/invoices/${inv.id}`, { timeout: 10000 })
    await expect(page).toHaveURL(new RegExp(`/invoices/${inv.id}$`))
  })

  test('invoices load fires GET /api/invoices and GET /api/clients', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/invoices')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.find((r) => r.method === 'GET' && /\/api\/invoices/.test(r.url))).toBeTruthy()
    expect(reqs.find((r) => r.method === 'GET' && /\/api\/clients/.test(r.url))).toBeTruthy()
  })

  test('create invoice → auto-includes client billable entries → total = hours × rate', async ({
    page,
  }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, {
      name: 'Northbridge Co',
      hourly_rate_cents: 12000,
    })
    const project = await seedProject(page, auth.accessToken, {
      name: 'Brand Refresh',
      client_id: client.id,
      hourly_rate_cents: 15000,
    })
    await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      description: 'Initial design exploration',
      started_at: new Date(Date.now() - 150 * 60_000).toISOString(),
      // 2.5 hours
      ended_at: new Date(Date.now()).toISOString(),
      is_billable: true,
    })

    await page.goto(APP_BASE + '/invoices')
    await page.locator('[data-test=new-invoice-toggle]').click()
    await page.locator('[data-test=invoice-client]').selectOption({ label: 'Northbridge Co' })
    // Wait for the auto-select to populate the source_entry_ids
    await page.waitForTimeout(800)
    const due = new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10)
    await page.locator('[data-test=invoice-due]').fill(due)

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-test=invoice-submit]').click()
      await page.waitForTimeout(2500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/invoices\/?$/.test(r.url))
    expect(post?.status).toBe(201)

    // List shows non-zero amount (2.5h × $150 = $375)
    await expect(page.locator('text=/\\$375\\b/')).toBeVisible({ timeout: 5000 })

    // Backend has it with line items linked to the entry
    const list = await page.request.get(`${API_BASE}/invoices`, {
      headers: apiHeaders(auth.accessToken),
    })
    const body = await list.json()
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(arr.length).toBe(1)
    expect(arr[0].total_cents).toBe(37500)
    expect(arr[0].client_id).toBe(client.id)
  })

  test('reject empty invoice (no eligible entries) — UI shows error, no row created', async ({
    page,
  }) => {
    const auth = await signup(page)
    await seedClient(page, auth.accessToken, { name: 'EmptyClient' })
    await page.goto(APP_BASE + '/invoices')
    await page.locator('[data-test=new-invoice-toggle]').click()
    await page.locator('[data-test=invoice-client]').selectOption({ label: 'EmptyClient' })
    await page.locator('[data-test=invoice-submit]').click()
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-test=invoices-error]')).toBeVisible()
    // No invoices created
    const list = await page.request.get(`${API_BASE}/invoices`, {
      headers: apiHeaders(auth.accessToken),
    })
    const body = await list.json()
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(arr.length).toBe(0)
  })

  test('mark sent → mark paid: status transitions persist + paid_at populated', async ({
    page,
  }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, {
      name: 'Stark',
      hourly_rate_cents: 10000,
    })
    const project = await seedProject(page, auth.accessToken, {
      name: 'Suit MK4',
      client_id: client.id,
      hourly_rate_cents: 30000,
    })
    const entry = await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 60 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
    })
    const invRes = await page.request.post(`${API_BASE}/invoices`, {
      headers: apiHeaders(auth.accessToken),
      data: {
        client_id: client.id,
        source_entry_ids: [entry.id],
        due_at: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
      },
    })
    const invBody = await invRes.json()
    const invoice = invBody.data ?? invBody

    await page.goto(APP_BASE + '/invoices/' + invoice.id)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-test=invoice-detail]')).toBeVisible()

    // Send (draft → sent)
    await page.locator('[data-test=invoice-send]').click()
    await expect(page.locator('text=/SENT\\b/i').first()).toBeVisible({ timeout: 5000 })

    // Mark paid
    await page.locator('[data-test=invoice-mark-paid]').click()
    await expect(page.locator('text=/PAID\\b/i').first()).toBeVisible({ timeout: 5000 })

    // Reload preserves paid status
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=/PAID\\b/i').first()).toBeVisible()

    // Backend reflects the transition + paid_at populated
    const get = await page.request.get(`${API_BASE}/invoices/${invoice.id}`, {
      headers: apiHeaders(auth.accessToken),
    })
    const fresh = await get.json()
    const obj = (fresh.data ?? fresh) as { status: string; paid_at: string | null }
    expect(obj.status).toBe('paid')
    expect(obj.paid_at).toBeTruthy()
  })

  test('deleted invoice un-marks linked entries (invoiced=false) so they become billable again', async ({
    page,
  }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, { client_id: client.id })
    const entry = await seedEntry(page, auth.accessToken, { project_id: project.id })

    const invRes = await page.request.post(`${API_BASE}/invoices`, {
      headers: apiHeaders(auth.accessToken),
      data: {
        client_id: client.id,
        source_entry_ids: [entry.id],
      },
    })
    const inv = (await invRes.json()).data ?? (await invRes.json())
    // After creating, the entry is invoiced=true
    const e1 = await page.request.get(`${API_BASE}/entries/${entry.id}`, {
      headers: apiHeaders(auth.accessToken),
    })
    const fresh1 = await e1.json()
    const obj1 = fresh1.data ?? fresh1
    expect(obj1.invoiced).toBe(true)

    // Delete
    const del = await page.request.delete(`${API_BASE}/invoices/${inv.id}`, {
      headers: apiHeaders(auth.accessToken),
    })
    expect(del.status()).toBe(204)

    // Entry returns to invoiced=false
    const e2 = await page.request.get(`${API_BASE}/entries/${entry.id}`, {
      headers: apiHeaders(auth.accessToken),
    })
    const fresh2 = await e2.json()
    const obj2 = fresh2.data ?? fresh2
    expect(obj2.invoiced).toBe(false)
  })
})
