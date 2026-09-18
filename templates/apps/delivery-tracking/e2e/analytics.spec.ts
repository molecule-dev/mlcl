import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup, unwrap } from './_helpers.js'

test.describe('/analytics', () => {
  test('renders the analytics heading + KPI cards', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByRole('heading', { name: /^Analytics$/i })).toBeVisible()
    await expect(page.getByText(/On-time rate/i).first()).toBeVisible()
    await expect(page.getByText(/Exception rate/i).first()).toBeVisible()
    await expect(page.getByText(/Avg transit/i).first()).toBeVisible()
    await expect(page.getByText(/Volume \(30d\)/i).first()).toBeVisible()
  })

  test('on-time rate KPI matches /api/reports/analytics.on_time_rate_overall', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/analytics')
    const { body } = await apiRequest<unknown>(page, 'GET', '/api/reports/analytics')
    const data = unwrap<any>(body)
    const expected = `${Math.round((data.on_time_rate_overall ?? 0) * 100)}%`
    await expect(page.getByText(expected, { exact: true }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('renders both per-carrier and status mix sections', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByRole('heading', { name: /On-time rate by carrier/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Status mix/i })).toBeVisible()
  })

  test('mounting analytics actually fires GET /api/reports/analytics (captureNetwork)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/analytics')
      await expect(page.getByRole('heading', { name: /^Analytics$/i })).toBeVisible()
    })
    const reportReq = reqs.find(
      (r) => r.method === 'GET' && /\/api\/reports\/analytics/.test(r.url),
    )
    expect(reportReq, 'mount must fetch /api/reports/analytics').toBeTruthy()
    expect(reportReq?.status).toBe(200)
  })
})
