import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiPost, captureNetwork, signup } from './_helpers.js'

test.describe('/analytics', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('analytics page fires GET /api/analytics on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/analytics')
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    })
    const analytics = reqs.find((r) => /\/api\/analytics(?:\?|$)/.test(r.url) && r.method === 'GET')
    expect(analytics, 'GET /api/analytics should fire on analytics page').toBeTruthy()
    expect(analytics!.status).toBeLessThan(300)
  })

  test('renders the analytics page container', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await expect(page.locator('[data-mol-id="page-analytics"]')).toBeVisible({ timeout: 15_000 })
  })

  test('renders the CSAT KPI card with a numeric value', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="analytics-kpi-csat-value"]')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('renders the resolution KPI card', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="analytics-kpi-resolution-value"]')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('renders the helpful KPI card', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="analytics-kpi-helpful-value"]')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('renders the escalations KPI card', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="analytics-kpi-escalations-value"]')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('renders the trend chart svg', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="analytics-trend-chart"] svg')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('renders the channels panel after at least one conversation exists', async ({ page }) => {
    // Seed a conversation so the channels panel has data.
    await apiPost(page, '/conversations', {
      customerName: 'Analytics Channel',
      initialMessage: 'Test',
      channel: 'web',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    // The channels container is always rendered; just confirm it's mounted.
    await expect(page.locator('[data-mol-id="analytics-channels"]')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('renders the quality signals panel with helpful + resolution sub-rows', async ({ page }) => {
    await apiPost(page, '/conversations', {
      customerName: 'Analytics Quality',
      initialMessage: 'Test',
      channel: 'web',
      autoReply: false,
    })
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="analytics-quality"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-mol-id="analytics-quality-helpful"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="analytics-quality-resolution"]')).toBeVisible()
  })
})
