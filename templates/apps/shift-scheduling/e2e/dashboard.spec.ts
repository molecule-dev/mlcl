/**
 * /dashboard — KPIs from /api/dashboard-stats, per-day coverage, today's
 * shifts, and the pending approvals sections.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, getStaff, signup } from './_helpers.js'

test.describe('dashboard page', () => {
  test('renders the overview heading and KPI labels', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /schedule overview/i })).toBeVisible()
    await expect(page.getByText(/staff on roster/i).first()).toBeVisible()
    await expect(page.getByText(/open shifts/i).first()).toBeVisible()
    await expect(page.getByText(/pending approvals/i).first()).toBeVisible()
    await expect(page.getByText(/coverage by day/i)).toBeVisible()
  })

  test('KPIs match the live API payload', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/dashboard-stats`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const stats = (await res.json()) as {
      staff_total: number
      active_staff: number
      open_shifts: number
      pending_approvals: number
      hours_scheduled: number
      coverage_by_day: unknown[]
    }
    // The roster the API returns must total what the KPI claims — not a
    // seed size.
    const roster = await getStaff(page, accessToken)
    expect(stats.staff_total).toBe(roster.length)
    expect(stats.active_staff).toBeLessThanOrEqual(stats.staff_total)
    expect(stats.coverage_by_day.length).toBe(7)
    expect(stats.hours_scheduled).toBeGreaterThanOrEqual(0)
  })
})
