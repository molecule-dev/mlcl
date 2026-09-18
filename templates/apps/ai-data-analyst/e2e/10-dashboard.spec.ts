import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /dashboard — KPIs from /api/reports/dashboard_stats, insights from
// /api/insights, demo seed runs on first call (4 datasets, 6 insights,
// 3 reports, 5 notifications). Personalized greeting from useAuth().

test.describe('/dashboard', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, dashboard shows KPIs from /api/reports/dashboard_stats and insights from /api/insights', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      // Pre-register both waiters BEFORE signup-triggered nav so responses
      // can't race past the listeners.
      const insightsP = page
        .waitForResponse((r) => r.url().includes('/api/insights'), { timeout: 20_000 })
        .catch(() => null)
      const statsP = page
        .waitForResponse((r) => r.url().includes('/api/reports/dashboard_stats'), {
          timeout: 20_000,
        })
        .catch(() => null)
      await signup(page)
      await page.waitForURL(/\/dashboard/)
      await Promise.all([insightsP, statsP])
    })
    const stats = reqs.find(
      (r) => r.method === 'GET' && /\/api\/reports\/dashboard_stats/.test(r.url),
    )
    const insights = reqs.find((r) => r.method === 'GET' && /\/api\/insights(\b|\?|$)/.test(r.url))
    expect(stats, 'GET /api/reports/dashboard_stats should fire').toBeDefined()
    expect(stats!.status).toBe(200)
    expect(insights, 'GET /api/insights should fire').toBeDefined()
    expect(insights!.status).toBe(200)
    await expect(page.locator('h1[data-mol-id="dashboard-greeting"]')).toContainText(/welcome/i)
  })

  test('greeting includes the signed-up user identifier', async ({ page }) => {
    const creds = await signup(page)
    await page.waitForURL(/\/dashboard/)
    const greeting = await page.locator('h1[data-mol-id="dashboard-greeting"]').textContent()
    const local = creds.email.split('@')[0]
    expect(greeting?.toLowerCase()).toContain(local.toLowerCase())
  })

  test('"Ask Clarion" CTA navigates to /query', async ({ page }) => {
    await signup(page)
    await page.waitForURL(/\/dashboard/)
    await page.getByRole('link', { name: /ask clarion/i }).click()
    await expect(page).toHaveURL(/\/query/)
  })

  test('"Upload data" CTA navigates to /upload', async ({ page }) => {
    await signup(page)
    await page.waitForURL(/\/dashboard/)
    await page.getByRole('link', { name: /upload data/i }).click()
    await expect(page).toHaveURL(/\/upload/)
  })
})
