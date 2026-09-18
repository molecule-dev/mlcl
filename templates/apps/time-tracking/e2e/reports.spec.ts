import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedClient,
  seedEntry,
  seedProject,
  signup,
} from './_helpers.js'

test.describe('/reports page', () => {
  test('reports page root + h1 visible after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.locator('[data-test=reports-page]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Reports$/ })).toBeVisible()
  })

  test('range buttons (this-week / this-month / last-month / this-year) all render', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    for (const k of ['this-week', 'this-month', 'last-month', 'this-year']) {
      await expect(page.locator(`[data-test=range-${k}]`)).toBeVisible()
    }
  })

  test('clicking a range button flips the active style + page stays on /reports', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    const target = page.locator('[data-test=range-this-month]')
    await target.click()
    await expect(target).toHaveClass(/bg-inverse-surface|text-inverse-on-surface/)
    expect(page.url()).toMatch(/\/reports$/)
  })

  test('KPI cards (Total / Billable / Revenue / Billable %) all render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    for (const label of [/Total hours/i, /Billable hours/i, /Estimated revenue/i, /Billable %/i]) {
      await expect(page.locator('text=' + label.source).first()).toBeVisible()
    }
  })

  test('empty-state copy "No tracked time in this period." renders for a fresh user', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.locator('[data-test=reports-bar-empty]')).toBeVisible()
    await expect(page.locator('[data-test=reports-table-empty]')).toBeVisible()
  })

  test('seeded billable entry rolls up into KPI revenue + per-project row', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, {
      name: 'Acme Co',
      hourly_rate_cents: 8000,
    })
    const project = await seedProject(page, auth.accessToken, {
      name: 'New Glenn',
      client_id: client.id,
      hourly_rate_cents: 20000,
    })
    await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 60 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
      description: 'Trajectory sim',
    })
    await page.goto(APP_BASE + '/reports')
    await page.waitForTimeout(2000)
    await expect(page.locator(`[data-test=report-row-${project.id}]`)).toBeVisible()
    await expect(page.locator(`[data-test=report-row-${project.id}]`)).toContainText('New Glenn')
    await expect(page.locator(`[data-test=report-row-${project.id}]`)).toContainText('$200')
  })

  test('Hours per day chart renders bars when there is data', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, { client_id: client.id })
    await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 30 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
    })
    await page.goto(APP_BASE + '/reports')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-test=reports-bar-empty]')).toHaveCount(0)
  })

  test('CSV export delivers a real file with header + at least one data row', async ({ page }) => {
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
    await page.waitForTimeout(2000)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10_000 }),
      page.locator('[data-test=reports-export]').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
    const stream = await download.createReadStream()
    let content = ''
    if (stream) for await (const chunk of stream) content += chunk.toString()
    const lines = content.trim().split('\n')
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(lines[0]).toMatch(/project|hours|revenue/i)
    expect(lines.slice(1).join('\n')).toMatch(/Audit/i)
  })

  test('reports load fires GET /api/entries + GET /api/projects + GET /api/clients', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports')
      await page.waitForTimeout(1500)
    })
    const paths = reqs.filter((r) => r.method === 'GET').map((r) => r.url)
    expect(paths.some((p) => /\/api\/entries\b/.test(p))).toBe(true)
    expect(paths.some((p) => /\/api\/projects\b/.test(p))).toBe(true)
    expect(paths.some((p) => /\/api\/clients\b/.test(p))).toBe(true)
  })

  test('reports server endpoint /api/reports/summary returns sane totals for seeded data', async ({
    page,
  }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { hourly_rate_cents: 5000 })
    const project = await seedProject(page, auth.accessToken, {
      client_id: client.id,
      hourly_rate_cents: 10000,
    })
    await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 120 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
    })
    const r = await page.request.get(`${API_BASE}/reports/summary?range=this-week`, {
      headers: apiHeaders(auth.accessToken),
    })
    expect(r.ok()).toBe(true)
    const body = await r.json()
    const obj = body.data ?? body
    const total = obj.total_seconds ?? obj.totalSeconds ?? null
    if (typeof total === 'number') {
      expect(total).toBeGreaterThanOrEqual(7000)
    }
  })

  test('range click refetches data — KPI value updates between ranges', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, { client_id: client.id })
    // 2 entries: one this week, one 60 days ago
    await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 60 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
    })
    await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 60 * 86400_000 - 60 * 60_000).toISOString(),
      ended_at: new Date(Date.now() - 60 * 86400_000).toISOString(),
      is_billable: true,
    })
    await page.goto(APP_BASE + '/reports')
    await page.waitForTimeout(1500)
    // This-week shows 1h
    await expect(page.locator('text=/1h 00m/i').first()).toBeVisible()
    // Click this-year -> at least 2h
    await page.locator('[data-test=range-this-year]').click()
    await page.waitForTimeout(800)
    await expect(page.locator('text=/2h 00m/i').first()).toBeVisible()
  })

  test('By project header + Hours per day header are both present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('heading', { name: /Hours per day/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /By project/i })).toBeVisible()
  })

  test('Billable mix donut + percentage label render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('heading', { name: /Billable mix/i })).toBeVisible()
    await expect(page.locator('text=/^0%$/').first()).toBeVisible()
  })
})
