import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  getAccessToken,
  signup,
  uploadInvoice,
} from './_helpers'

test.describe('/dashboard', () => {
  test('renders KPI tiles + recent table on a fresh account', async ({ page }) => {
    await signup(page)
    // signup may already have landed us on /dashboard. Bounce away so the
    // dashboard's effect re-runs under our captureNetwork listener.
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('domcontentloaded')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await Promise.all([
        page.waitForResponse(
          (r) => /\/api\/reports\/dashboard_stats/.test(r.url()) && r.status() === 200,
          { timeout: 15_000 },
        ),
        page.waitForResponse(
          (r) =>
            r.request().method() === 'GET' &&
            /\/api\/documents(?:\?|$)/.test(r.url()) &&
            r.status() === 200,
          { timeout: 15_000 },
        ),
      ])
    })
    expect(
      reqs.find((r) => /\/api\/documents(?:\?|$)/.test(r.url) && r.method === 'GET'),
      'GET /api/documents should fire on /dashboard',
    ).toBeDefined()
    expect(
      reqs.find((r) => /\/api\/reports\/dashboard_stats/.test(r.url)),
      'GET /api/reports/dashboard_stats should fire on /dashboard',
    ).toBeDefined()
    await expect(page.locator('[data-mol-id="dashboard-page"]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/pending review/i).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /recent.*documents/i })).toBeVisible()
  })

  test('after a successful upload, dashboard stats reflect the new document', async ({ page }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    expect(uploaded.document_type).toBe('invoice')

    const token = await getAccessToken(page)
    const stats = await page.request.get(API_BASE + '/reports/dashboard_stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await stats.json()
    expect(body.processed_today).toBeGreaterThanOrEqual(1)
    const invSeg = (body.type_breakdown || []).find((s: { type: string }) => s.type === 'invoice')
    expect(invSeg, 'invoice segment exists in dashboard breakdown').toBeDefined()
    expect(invSeg.count).toBeGreaterThanOrEqual(1)

    // The Recent table also surfaces the new doc. Arm the response wait
    // BEFORE goto — the /api/documents fetch can resolve before the awaiter
    // subscribes, causing a 15s timeout.
    const docsResponse = page.waitForResponse(
      (r) => /\/api\/documents/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/dashboard')
    await docsResponse
    await expect(
      page.locator('[data-mol-id="dashboard-page"] a[href^="/documents/"]').first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('"View all →" link in Recent goes to /documents', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await page
      .getByRole('link', { name: /view all/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/documents$/)
  })

  test('Recent table renders header heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /recent.*documents/i })).toBeVisible()
  })

  test('main heading is rendered with text content (not empty)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('domcontentloaded')
    const text = await page.getByRole('heading', { level: 1 }).first().textContent()
    expect(text?.trim().length, 'h1 must have visible text').toBeGreaterThan(0)
  })

  test('after upload, recent-table row links to /documents/:id', async ({ page }) => {
    await signup(page)
    const uploaded = await uploadInvoice(page)
    // Arm the response wait BEFORE goto — see the race note above.
    const docsResponse = page.waitForResponse(
      (r) => /\/api\/documents/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/dashboard')
    await docsResponse
    const link = page.locator('[data-mol-id="dashboard-page"] a[href^="/documents/"]').first()
    await expect(link).toBeVisible({ timeout: 10_000 })
    expect(await link.getAttribute('href')).toBe(`/documents/${uploaded.id}`)
  })
})
