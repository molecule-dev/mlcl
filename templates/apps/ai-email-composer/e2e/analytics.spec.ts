import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, apiPost, signup } from './_helpers.js'

interface AnalyticsSummary {
  total_sent: number
  total_delivered: number
  total_opened: number
  total_clicked: number
  total_failed: number
  open_rate: number
  click_rate: number
  reply_rate: number
}

interface DraftRow {
  id: string
  status: string
}

test('GET /sent-emails/analytics/summary returns integer percentage rates', async ({ page }) => {
  await signup(page)
  const r = await apiGet<AnalyticsSummary>(page, '/sent-emails/analytics/summary')
  expect(r.status).toBe(200)
  expect(r.body).toBeTruthy()
  expect(typeof r.body!.total_sent).toBe('number')
  expect(typeof r.body!.open_rate).toBe('number')
  expect(typeof r.body!.click_rate).toBe('number')
  expect(typeof r.body!.reply_rate).toBe('number')
  // Rates are always within 0..100
  expect(r.body!.open_rate).toBeGreaterThanOrEqual(0)
  expect(r.body!.open_rate).toBeLessThanOrEqual(100)
})

test('Sending an email increments total_sent by 1 within the window', async ({ page }) => {
  test.setTimeout(120_000)
  await signup(page)
  const before = await apiGet<AnalyticsSummary>(page, '/sent-emails/analytics/summary')

  const draft = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'Analytics tick ' + Date.now(),
    body: 'Body',
    recipients: ['analytics@example.com'],
  })
  expect(draft.status).toBe(201)
  const send = await apiPost(page, `/drafts/${draft.body!.id}/send`, {})
  expect(send.status).toBe(200)

  const after = await apiGet<AnalyticsSummary>(page, '/sent-emails/analytics/summary')
  expect(after.body!.total_sent).toBeGreaterThanOrEqual((before.body?.total_sent ?? 0) + 1)
})

test('Analytics page UI renders the summary KPI cards', async ({ page }) => {
  await signup(page)
  await page.goto('/analytics')
  await expect(
    page.locator('[data-mol-id="analytics-page"] [data-mol-id="kpi-drafts"]'),
  ).toBeVisible({ timeout: 15_000 })
  await expect(
    page.locator('[data-mol-id="analytics-page"] [data-mol-id="kpi-scheduled"]'),
  ).toBeVisible()
  await expect(
    page.locator('[data-mol-id="analytics-page"] [data-mol-id="kpi-openRate"]'),
  ).toBeVisible()
  await expect(
    page.locator('[data-mol-id="analytics-page"] [data-mol-id="kpi-replyRate"]'),
  ).toBeVisible()
})
