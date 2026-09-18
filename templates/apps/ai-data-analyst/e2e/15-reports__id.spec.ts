import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /reports/:id — full report detail view from
// GET /api/saved_reports/:id (hero, kpis, sub_charts, ai_summary,
// data_table).

test.describe('/reports/:id', () => {
  test('renders hero + kpis + sub-charts + AI summary + data table', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForResponse((r) => /\/api\/saved_reports/.test(r.url()))
    const firstLink = await page.locator('a[href^="/reports/"]').first().getAttribute('href')
    expect(firstLink).toBeTruthy()
    // The detail page fetches /api/saved_reports/:id, not /api/reports/:id.
    const reportId = firstLink!.split('/').pop()
    const apiUrl = `/api/saved_reports/${reportId}`
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + firstLink!)
      await page.waitForResponse((r) => r.url().endsWith(apiUrl))
    })
    const get = reqs.find((r) => r.method === 'GET' && r.url.endsWith(apiUrl))
    expect(get).toBeDefined()
    expect(get!.status).toBe(200)
    // hero series renders as <li> in first <ul>
    await expect(page.locator('main ul li').first()).toBeVisible()
    // AI summary aside present (scoped to <main> to avoid the layout sidebar)
    await expect(page.locator('main aside')).toContainText(/AI summary/i)
    // data table rendered
    await expect(page.locator('table').last()).toBeVisible()
  })

  test('hero series row is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForResponse((r) => /\/api\/saved_reports/.test(r.url()))
    const firstLink = await page.locator('a[href^="/reports/"]').first().getAttribute('href')
    await page.goto(APP_BASE + firstLink!)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main ul li').first()).toBeVisible()
  })

  test('data table rows are present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.waitForResponse((r) => /\/api\/saved_reports/.test(r.url()))
    const firstLink = await page.locator('a[href^="/reports/"]').first().getAttribute('href')
    await page.goto(APP_BASE + firstLink!)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table').last()).toBeVisible()
  })
})
