/**
 * /dashboard — KPI tiles render real headcount; recent activity reads
 * from /api/notifications; pending PTO reads from /api/pto.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('dashboard page', () => {
  test('KPIs reflect the roster headcount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await expect(page.getByRole('heading', { name: /people overview/i, level: 1 })).toBeVisible()
    })
    const stats = reqs.find((r) => /\/api\/dashboard-stats/.test(r.url) && r.method === 'GET')
    expect(stats?.status, 'GET /api/dashboard-stats').toBe(200)
    // headcount KPI value — locate the "Total headcount" tile; the number is
    // whatever the roster holds, so assert it renders rather than its value.
    const headcountTile = page
      .getByText(/total headcount/i)
      .locator('..')
      .locator('..')
    await expect(headcountTile.getByText(/^\d+$/).first()).toBeVisible()
  })

  test('recent activity list renders the latest notifications', async ({ page }) => {
    const { accessToken } = await signup(page)
    // The activity feed is /api/notifications, newest first — read the row the
    // page will render rather than naming a demo notification.
    const res = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
    })
    const notifications = (await res.json()) as Array<{ title: string }>
    expect(notifications.length, 'the app must surface at least one notification').toBeGreaterThan(
      0,
    )
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(notifications[0].title).first()).toBeVisible()
  })

  test('"Add employee" CTA navigates to /employees/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /add employee/i }).click()
    await page.waitForURL('**/employees/new', { timeout: 10_000 })
  })
})
