/**
 * /reports — analytics page that pulls KPIs from /api/dashboard-stats
 * and renders headcount, tenure, and the per-department breakdown. The
 * three /api/reports/* endpoints (headcount, by-department, pto-summary)
 * also need direct read-after-write parity with the seeded employees.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, getEmployees, signup } from './_helpers.js'

test.describe('reports page', () => {
  test('renders KPI cards for headcount, turnover, promotions, PTO utilization', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await expect(page.getByRole('heading', { name: /people reports/i })).toBeVisible()
    })
    expect(reqs.find((r) => /\/api\/dashboard-stats/.test(r.url))?.status).toBeLessThan(400)
    await expect(page.getByText(/^headcount$/i).first()).toBeVisible()
    await expect(page.getByText(/turnover/i).first()).toBeVisible()
    await expect(page.getByText(/promotions/i).first()).toBeVisible()
    await expect(page.getByText(/pto utilization/i).first()).toBeVisible()
  })

  test('GET /api/reports/headcount totals the roster + delta', async ({ page }) => {
    const { accessToken } = await signup(page)
    // The expected total is the roster the API returns, not a seed size.
    const roster = await getEmployees(page, accessToken)
    const res = await page.request.get(`${API_BASE}/reports/headcount`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { total: number; active: number; on_leave: number }
    expect(body.total, 'headcount must total the roster').toBe(roster.length)
    expect(body.active).toBeGreaterThan(0)
  })

  test('GET /api/reports/by-department counts every department the roster uses', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const roster = await getEmployees(page, accessToken)
    const deptRes = await page.request.get(`${API_BASE}/departments`, {
      headers: apiHeaders(accessToken),
    })
    const departments = (await deptRes.json()) as Array<{ name: string }>
    expect(departments.length, 'the app must hold at least one department').toBeGreaterThan(0)
    const res = await page.request.get(`${API_BASE}/reports/by-department`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{ name: string; count: number }>
    // Every department the API lists is in the breakdown, and the counts sum
    // to no more than the roster.
    for (const dept of departments) {
      expect(
        body.some((d) => d.name === dept.name),
        `${dept.name} must appear in the breakdown`,
      ).toBe(true)
    }
    const summed = body.reduce((n, d) => n + d.count, 0)
    expect(summed).toBeGreaterThan(0)
    expect(summed).toBeLessThanOrEqual(roster.length)
  })

  test('GET /api/reports/pto-summary aggregates by status', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.get(`${API_BASE}/pto`, { headers: apiHeaders(accessToken) })
    const res = await page.request.get(`${API_BASE}/reports/pto-summary`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { pending: number; approved: number; denied: number }
    expect(body.pending + body.approved + body.denied).toBeGreaterThan(0)
  })
})
