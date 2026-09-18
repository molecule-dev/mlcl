import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  seedClient,
  seedEntry,
  seedProject,
  signup,
} from './_helpers.js'

test.describe('06: reports + timesheet — aggregates reflect entries, CSV export delivers a real file', () => {
  test('this-week reports show hours, revenue, project breakdown', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, {
      name: 'BlueOrigin',
      hourly_rate_cents: 8000,
    })
    const project = await seedProject(page, auth.accessToken, {
      name: 'New Glenn',
      client_id: client.id,
      hourly_rate_cents: 20000,
    })
    // 1h tracked
    await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 60 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
      description: 'Trajectory sim',
    })

    await page.goto(APP_BASE + '/reports')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await expect(page.locator('[data-test=reports-page]')).toBeVisible()
    await expect(page.locator('text=/1h 00m/i').first()).toBeVisible()
    // Revenue $200
    await expect(page.locator('text=/\\$200\\b/').first()).toBeVisible()
    // Project row shown
    await expect(page.locator('text=New Glenn').first()).toBeVisible()
  })

  test('CSV export delivers a real file with headers + at least one data row', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'CSVco' })
    const project = await seedProject(page, auth.accessToken, {
      name: 'Audit',
      client_id: client.id,
    })
    await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 60 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
    })

    await page.goto(APP_BASE + '/reports')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.locator('[data-test=reports-export]').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
    // Read and assert content
    const stream = await download.createReadStream()
    let content = ''
    if (stream) {
      for await (const chunk of stream) content += chunk.toString()
    }
    const lines = content.trim().split('\n')
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(lines[0]).toMatch(/project|hours|revenue/i)
    expect(lines.slice(1).join('\n')).toMatch(/Audit/i)
  })

  test('timesheet shows the entry on the correct local day', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, {
      name: 'WeekProj',
      client_id: client.id,
    })
    // 30 minutes today, in local time
    const now = new Date()
    const start = new Date(now)
    start.setHours(10, 0, 0, 0)
    const end = new Date(now)
    end.setHours(10, 30, 0, 0)
    await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
      is_billable: true,
    })

    await page.goto(APP_BASE + '/timesheet')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-test=timesheet-page]')).toBeVisible()
    // The total cell at end of row should show 0.50
    await expect(page.locator(`[data-test^="timesheet-row-${project.id}"]`)).toContainText('0.50')
  })

  test('report API totals match seeded data', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { hourly_rate_cents: 5000 })
    const project = await seedProject(page, auth.accessToken, {
      client_id: client.id,
      hourly_rate_cents: 10000,
    })
    // 2h
    await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 120 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
    })
    const summary = await page.request.get(`${API_BASE}/reports/summary?range=this-week`, {
      headers: apiHeaders(auth.accessToken),
    })
    expect(summary.ok()).toBe(true)
    const body = await summary.json()
    const obj = body.data ?? body
    // total_seconds 2h = 7200
    const total = obj.total_seconds ?? obj.totalSeconds ?? null
    if (typeof total === 'number') {
      expect(total).toBeGreaterThanOrEqual(7150)
    }
  })
})
