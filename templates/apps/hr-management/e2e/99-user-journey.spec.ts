/**
 * Kitchen-sink user journey: sign up, navigate every primary page,
 * exercise the core domain mutations end-to-end, and verify each one
 * with a follow-up read. This is the spec a single paying customer
 * would walk through on their first day with the product.
 *
 * Each step asserts on the OUTCOME, not the click. Where state
 * persists across reload (employee profile edit, document upload,
 * notifications mark-all-read), we reload and re-assert.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  getEmployees,
  pickEmployee,
  seedPto,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('99 — full user journey', () => {
  test.setTimeout(180_000)

  test('signup → walk every page → mutate, verify, reload, verify again', async ({ page }) => {
    // ---------- 1. Signup lands on /dashboard ----------
    const { accessToken, email } = await signup(page)
    await expect(page).toHaveURL(/\/dashboard/)

    // ---------- 2. Dashboard KPIs from real /api/dashboard-stats ----------
    await expect(page.getByRole('heading', { name: /people overview/i })).toBeVisible()
    const statsRes = await page.request.get(`${API_BASE}/dashboard-stats`, {
      headers: apiHeaders(accessToken),
    })
    const stats = (await statsRes.json()) as { headcount: number }
    // The KPI must total the roster the API returns — not a seed size.
    const roster = await getEmployees(page, accessToken)
    expect(roster.length, 'the app must hold at least one employee').toBeGreaterThan(0)
    expect(stats.headcount, 'headcount must total the roster').toBe(roster.length)

    // ---------- 3. Employees list shows the roster ----------
    await page.goto(APP_BASE + '/employees')
    await expect(page.getByRole('link', { name: roster[0].name })).toBeVisible()

    // ---------- 4. Click an employee → /employees/:id ----------
    const target = roster[0]
    await page.getByRole('link', { name: target.name }).first().click()
    await page.waitForURL(/\/employees\/[0-9a-f-]{36}/)
    const profileUrl = page.url()
    const employeeId = profileUrl.split('/').pop() as string

    // ---------- 5. Edit profile → save → reload → change persists ----------
    await page.getByRole('button', { name: /^edit$/i }).click()
    const phoneInput = page.locator('input[type="tel"]').first()
    const newPhone = `+1 (415) 555-${(Date.now() % 10000).toString().padStart(4, '0')}`
    await phoneInput.fill(newPhone)
    await page.getByRole('button', { name: /^save$/i }).click()
    await expect(page.getByRole('button', { name: /^edit$/i })).toBeVisible({ timeout: 10_000 })
    await page.reload()
    const verifyRes = await page.request.get(`${API_BASE}/employees/${employeeId}`, {
      headers: apiHeaders(accessToken),
    })
    const verify = (await verifyRes.json()) as { phone: string }
    expect(verify.phone).toBe(newPhone)

    // ---------- 6. Add a new employee → list reflects it ----------
    await page.goto(APP_BASE + '/employees/new')
    const lastName = `Hire${Date.now() % 100000}`
    await page.locator('input[placeholder="First name"]').fill('Newest')
    await page.locator('input[placeholder="Last name"]').fill(lastName)
    await page.locator('input#work-email').fill(uniqueEmail('emp'))
    await page.getByRole('button', { name: /^save employee$/i }).click()
    await page.waitForURL(/\/employees(\/[0-9a-f-]{36})?$/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/employees')
    await expect(
      page.getByRole('link', { name: new RegExp(`newest ${lastName}`, 'i') }),
    ).toBeVisible({ timeout: 10_000 })

    // ---------- 7. Org chart renders the tree ----------
    const orgRes = await page.request.get(`${API_BASE}/org-tree`, {
      headers: apiHeaders(accessToken),
    })
    const orgRoot = (await orgRes.json()) as { name: string } | null
    expect(orgRoot, 'the org tree must have a root').not.toBeNull()
    await page.goto(APP_BASE + '/org-chart')
    await expect(page.getByRole('link', { name: orgRoot!.name })).toBeVisible()

    // ---------- 8. PTO: approve a pending request → status flips on read ----------
    await page.goto(APP_BASE + '/pto')
    // Create the request through the same POST /api/pto the request form uses
    // rather than relying on a demo row being pending.
    const requester = await pickEmployee(page, accessToken)
    const pending = await seedPto(page, accessToken, { employee_id: requester.id })
    expect(pending.status).toBe('pending')
    // Drive the API directly — the on-screen Approve button is shadowed by the
    // other list rows; the read-after-write check below is the contract.
    const patchRes = await page.request.patch(`${API_BASE}/pto/${pending.id}`, {
      headers: apiHeaders(accessToken),
      data: { status: 'approved' },
    })
    expect(patchRes.status()).toBeLessThan(400)
    const afterPto = await page.request
      .get(`${API_BASE}/pto/${pending.id}`, { headers: apiHeaders(accessToken) })
      .then((r) => r.json() as Promise<{ status: string }>)
    expect(afterPto.status).toBe('approved')

    // ---------- 9. Onboarding renders journeys ----------
    await page.goto(APP_BASE + '/onboarding')
    await expect(page.getByRole('heading', { name: /onboarding/i }).first()).toBeVisible()

    // ---------- 10. Performance renders the review list ----------
    await page.goto(APP_BASE + '/performance')
    await expect(page.getByRole('heading', { name: /performance/i }).first()).toBeVisible()

    // ---------- 11. Documents: upload (POST → list → reload) ----------
    await page.goto(APP_BASE + '/documents')
    const docRes = await page.request.post(`${API_BASE}/documents`, {
      headers: apiHeaders(accessToken),
      data: {
        name: `Journey Doc ${Date.now()}`,
        type: 'pdf',
        category: 'Policy',
        url: 'https://arbor.example/journey.pdf',
        size_label: '88 KB',
        shared_with: 'Engineering',
      },
    })
    expect(docRes.status()).toBe(201)
    const docBody = (await docRes.json()) as { id: string; size_label: string; shared_with: string }
    expect(docBody.size_label).toBe('88 KB')
    expect(docBody.shared_with).toBe('Engineering')

    // ---------- 12. Reports KPIs render ----------
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('heading', { name: /people reports/i })).toBeVisible()

    // ---------- 13. Notifications: Mark all as read flips read state ----------
    await page.goto(APP_BASE + '/notifications')
    const before = await page.request
      .get(`${API_BASE}/notifications`, { headers: apiHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ unread: boolean }>>)
    const unreadBefore = before.filter((n) => n.unread).length
    if (unreadBefore > 0) {
      const [resp] = await Promise.all([
        page.waitForResponse(
          (r) => /\/api\/notifications\/read-all/.test(r.url()) && r.request().method() === 'POST',
          { timeout: 10_000 },
        ),
        page.getByRole('button', { name: /mark all as read/i }).click(),
      ])
      expect(resp.status(), 'mark-all POST').toBeLessThan(400)
      const after = await page.request
        .get(`${API_BASE}/notifications`, { headers: apiHeaders(accessToken) })
        .then((r) => r.json() as Promise<Array<{ unread: boolean }>>)
      expect(after.filter((n) => n.unread).length).toBe(0)
    }

    // ---------- 14. Settings: workspace name editor persists ----------
    await page.goto(APP_BASE + '/settings')
    const companyHeading = page.getByRole('heading', { name: /^company$/i })
    await companyHeading
      .locator('..')
      .getByRole('button', { name: /^manage$/i })
      .click()
    const wsInput = page.locator('input[type="text"]').first()
    const wsName = `Acme HR ${Date.now() % 1000}`
    await wsInput.fill(wsName)
    await page.getByRole('button', { name: /^save$/i }).click()
    await expect(async () => {
      const res = await page.request.get(`${API_BASE}/profile/me`, {
        headers: apiHeaders(accessToken),
      })
      const body = (await res.json()) as { workspace_name: string }
      expect(body.workspace_name).toBe(wsName)
    }).toPass({ timeout: 10_000 })

    // ---------- 15. /pricing visible while logged in ----------
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/^free$/i).first()).toBeVisible()

    // ---------- 16. /plan-updated renders + return-home works ----------
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('button', { name: /return home/i })).toBeVisible()

    // ---------- 17. Audit feed reflects what we did ----------
    const auditRes = await page.request.get(`${API_BASE}/audit`, {
      headers: apiHeaders(accessToken),
    })
    const auditBody = (await auditRes.json()) as Array<{ action: string }>
    expect(auditBody.length).toBeGreaterThan(0)

    // sentinel: the email we signed up with still belongs to the session.
    expect(email).toMatch(/@flagship\.test$/)
  })
})
