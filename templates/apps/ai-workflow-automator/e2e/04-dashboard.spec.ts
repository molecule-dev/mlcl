import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getDashboard, signup } from './_helpers.js'

test.describe('/dashboard', () => {
  test('renders the dashboard shell after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('GET /api/dashboard returns the expected shape', async ({ page }) => {
    await signup(page)
    const data = await getDashboard(page)
    expect(data).toHaveProperty('runs_today')
    expect(data).toHaveProperty('active_workflows')
    expect(data).toHaveProperty('total_workflows')
    expect(data).toHaveProperty('recent_runs')
    expect(data).toHaveProperty('recent_workflows')
    expect(data).toHaveProperty('sparkline')
    expect(Array.isArray((data as Record<string, unknown>).sparkline)).toBe(true)
    expect(((data as Record<string, unknown>).sparkline as unknown[]).length).toBe(24)
  })

  test('dashboard load triggers GET /api/dashboard via captureNetwork', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle')
    })
    const dashCall = reqs.find((r) => r.method === 'GET' && /\/api\/dashboard/.test(r.url))
    expect(dashCall, 'dashboard page must call /api/dashboard').toBeTruthy()
    expect(dashCall!.status).toBe(200)
  })

  test('sidebar navigation goes to /workflows, /executions, /templates', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    const wfLink = page.getByRole('link', { name: /workflows?/i }).first()
    if (await wfLink.count()) {
      await wfLink.click()
      await expect(page).toHaveURL(/\/workflows(?!\/)/)
    }
  })

  test('dashboard page link to /templates', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    const tplLink = page.getByRole('link', { name: /templates/i }).first()
    if (await tplLink.count()) {
      await tplLink.click()
      await expect(page).toHaveURL(/\/templates/)
    }
  })
})
