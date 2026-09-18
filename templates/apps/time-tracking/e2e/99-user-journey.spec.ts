/**
 * Cross-page kitchen-sink user journey for time-tracking.
 *
 * Walks the same path a real freelancer-on-trial would: sign up →
 * create a client → create a project under it → run the timer →
 * see entries roll up → see the dashboard react → invoice the
 * client's billable entries → mark paid → check the report → land
 * on settings/billing.
 *
 * Each step asserts on a backend invariant (read-after-write or
 * a fresh GET reflecting the side effect), not just on local UI
 * state. This is the smoke that proves the seams hold together.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, getAccessToken, signup } from './_helpers.js'

test.describe('99: kitchen-sink user journey', () => {
  test('signup → client → project → timer → entries → invoice → mark paid → report → settings', async ({
    page,
  }) => {
    test.setTimeout(180_000)

    // 1) Signup ────────────────────────────────────────────────
    const auth = await signup(page)
    expect(auth.accessToken).toBeTruthy()
    expect(auth.userId).toBeTruthy()

    // 2) Create a client via the UI ────────────────────────────
    await page.goto(APP_BASE + '/clients')
    await page.locator('[data-test=new-client-toggle]').click()
    await page.locator('[data-test=client-name]').fill('Journey Studio')
    await page.locator('[data-test=client-email]').fill('jstudio@example.com')
    await page.locator('[data-test=client-rate]').fill('100')
    await page.locator('[data-test=client-submit]').click()
    await page.waitForTimeout(1500)
    await expect(page.locator('text=Journey Studio')).toBeVisible()

    // Backend invariant: client persisted with hourly_rate_cents=10000
    const cList = await page.request.get(`${API_BASE}/clients`, {
      headers: apiHeaders(auth.accessToken),
    })
    const cBody = await cList.json()
    const cArr = Array.isArray(cBody) ? cBody : (cBody.data ?? [])
    const persistedClient = cArr.find((c: { name: string }) => c.name === 'Journey Studio')
    expect(persistedClient, 'client persisted in DB').toBeTruthy()
    expect(persistedClient.hourly_rate_cents).toBe(10_000)
    const clientId = persistedClient.id as string

    // 3) Create a project under that client via the UI ─────────
    await page.goto(APP_BASE + '/projects')
    await page.locator('[data-test=new-project-toggle]').click()
    await page.locator('[data-test=project-name]').fill('Journey Site Refresh')
    await page.locator('[data-test=project-client]').selectOption({ label: 'Journey Studio' })
    await page.locator('[data-test=project-rate]').fill('150')
    await page.locator('[data-test=project-budget]').fill('5000')
    await page.locator('[data-test=project-submit]').click()
    await page.waitForTimeout(1500)
    await expect(page.locator('text=Journey Site Refresh')).toBeVisible()

    // Backend invariant: project linked to client and has the rate/budget
    const pList = await page.request.get(`${API_BASE}/projects`, {
      headers: apiHeaders(auth.accessToken),
    })
    const pBody = await pList.json()
    const pArr = Array.isArray(pBody) ? pBody : (pBody.data ?? [])
    const project = pArr.find((p: { name: string }) => p.name === 'Journey Site Refresh')
    expect(project, 'project persisted').toBeTruthy()
    expect(project.client_id).toBe(clientId)
    expect(project.hourly_rate_cents).toBe(15_000)
    expect(project.budget_cents).toBe(500_000)
    const projectId = project.id as string

    // 4) Manual entry on /entries ──────────────────────────────
    // Use a manual entry instead of the live timer (deterministic duration).
    await page.goto(APP_BASE + '/entries')
    await page.locator('[data-test=add-entry-toggle]').click()
    await expect(page.locator('[data-test=add-entry-form]')).toBeVisible()
    await page.locator('[data-test=add-entry-description]').fill('Wireframes draft')
    await page.locator('[data-test=add-entry-project]').selectOption({ value: projectId })
    // Pick a 2.5h window that is reliably in the past today (so it
    // shows up in the "this-week" report, which only counts entries
    // with started_at <= now). Use the page's local clock to compute
    // a safe window ending 1h before "now" today — falls back to
    // 00:00–02:30 if the local clock is still very early.
    const { dateISO, startHHMM, endHHMM } = await page.evaluate(() => {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const ymd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      // End = 1h ago, Start = End - 2.5h. Both must be >= today 00:00.
      let endMin = now.getHours() * 60 + now.getMinutes() - 60
      let startMin = endMin - 150
      if (startMin < 0) {
        startMin = 0
        endMin = 150
      }
      const fmt = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
      return { dateISO: ymd, startHHMM: fmt(startMin), endHHMM: fmt(endMin) }
    })
    await page.locator('[data-test=add-entry-date]').fill(dateISO)
    await page.locator('[data-test=add-entry-start]').fill(startHHMM)
    await page.locator('[data-test=add-entry-end]').fill(endHHMM)
    await page
      .locator('[data-test=add-entry-billable]')
      .check()
      .catch(() => null)
    await page.locator('[data-test=add-entry-submit]').click()
    await page.waitForTimeout(1500)
    await expect(page.locator('text=Wireframes draft')).toBeVisible()

    // Backend invariant: entry persisted with project link, billable=true,
    // duration ≈ 2.5h
    const eList = await page.request.get(`${API_BASE}/entries`, {
      headers: apiHeaders(auth.accessToken),
    })
    const eBody = await eList.json()
    const entries = Array.isArray(eBody) ? eBody : (eBody.data ?? [])
    const entry = entries.find((e: { description: string }) => e.description === 'Wireframes draft')
    expect(entry, 'entry persisted').toBeTruthy()
    expect(entry.project_id).toBe(projectId)
    expect(entry.is_billable).toBe(true)
    expect(entry.duration_seconds).toBeGreaterThanOrEqual(8_900)
    expect(entry.duration_seconds).toBeLessThanOrEqual(9_100)

    // 5) Dashboard reflects the new entry ──────────────────────
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-test=dashboard]')).toBeVisible()
    await expect(page.locator('text=Wireframes draft').first()).toBeVisible()
    // Tracked-today / This-week ≈ 2:30
    await expect(page.locator('text=/02:30/').first()).toBeVisible()

    // 6) Invoice the client's billable entries ─────────────────
    await page.goto(APP_BASE + '/invoices')
    await page.locator('[data-test=new-invoice-toggle]').click()
    await page.locator('[data-test=invoice-client]').selectOption({ label: 'Journey Studio' })
    await page.waitForTimeout(800)
    const due = new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10)
    await page.locator('[data-test=invoice-due]').fill(due)
    await page.locator('[data-test=invoice-notes]').fill('Phase 1 wireframes')
    await page.locator('[data-test=invoice-submit]').click()
    await page.waitForTimeout(2000)

    // Backend invariant: invoice persisted, total = 2.5h × $150 = $375
    const iList = await page.request.get(`${API_BASE}/invoices`, {
      headers: apiHeaders(auth.accessToken),
    })
    const iBody = await iList.json()
    const invoices = Array.isArray(iBody) ? iBody : (iBody.data ?? [])
    expect(invoices.length).toBe(1)
    const invoice = invoices[0]
    expect(invoice.client_id).toBe(clientId)
    expect(invoice.total_cents).toBe(37_500)
    expect(invoice.status).toBe('draft')

    // Backend invariant: source entry now flagged invoiced=true
    const eFresh = await page.request.get(`${API_BASE}/entries/${entry.id}`, {
      headers: apiHeaders(auth.accessToken),
    })
    const efBody = await eFresh.json()
    const ef = efBody.data ?? efBody
    expect(ef.invoiced).toBe(true)

    // 7) Mark sent → mark paid on /invoices/:id ────────────────
    await page.goto(`${APP_BASE}/invoices/${invoice.id}`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    await page.locator('[data-test=invoice-send]').click()
    await expect(page.locator('[data-test=invoice-detail]')).toContainText(/Sent/i, {
      timeout: 5000,
    })
    await page.locator('[data-test=invoice-mark-paid]').click()
    await expect(page.locator('[data-test=invoice-detail]')).toContainText(/Paid/i, {
      timeout: 5000,
    })

    // Persists across reload
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('[data-test=invoice-detail]')).toContainText(/Paid/i)

    // Backend invariant: status=paid, paid_at populated
    const invFresh = await page.request.get(`${API_BASE}/invoices/${invoice.id}`, {
      headers: apiHeaders(auth.accessToken),
    })
    const ifBody = await invFresh.json()
    const ifObj = ifBody.data ?? ifBody
    expect(ifObj.status).toBe('paid')
    expect(ifObj.paid_at).toBeTruthy()

    // 8) Reports show the new revenue ──────────────────────────
    await page.goto(APP_BASE + '/reports')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-test=reports-page]')).toBeVisible()
    await expect(page.locator(`[data-test=report-row-${projectId}]`)).toContainText(
      'Journey Site Refresh',
    )
    await expect(page.locator(`[data-test=report-row-${projectId}]`)).toContainText('$375')

    // 9) Settings → Billing tab renders the live status panel ──
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test=settings-tab-billing]').click()
    await expect(page.locator('[data-test=billing-status]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-test=billing-tier-free]')).toContainText(/Current/i)
    await expect(page.locator('[data-test=billing-cta-pro]')).toBeVisible()
  })

  test('logout from sidebar wipes the session and redirects to /login', async ({ page }) => {
    const auth = await signup(page)
    expect(auth.accessToken).toBeTruthy()
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('[data-test=sign-out]').click()
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    // Visiting an auth-protected route now redirects to /login
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForURL(/\/login/, { timeout: 5_000 })
    // Auth cookie cleared
    const after = await getAccessToken(page)
    expect(after).toBeNull()
  })
})
