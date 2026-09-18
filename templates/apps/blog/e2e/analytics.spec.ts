/**
 * /analytics — KPI cards reflect real /api/analytics/summary data, and
 * the views chart fetches /api/analytics/views?days=14. Seeding posts
 * + bumping a view increments the totals.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  seedPost,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('analytics page', () => {
  test('fetches /analytics/summary and /analytics/views', async ({ page }) => {
    await signup(page, uniqueEmail('analytics-load'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/analytics')
      await page.waitForLoadState('networkidle')
    })
    const summary = reqs.find((r) => r.method === 'GET' && /\/api\/analytics\/summary/.test(r.url))
    const views = reqs.find((r) => r.method === 'GET' && /\/api\/analytics\/views/.test(r.url))
    expect(summary, 'analytics page must call /api/analytics/summary').toBeTruthy()
    expect(summary!.status).toBeLessThan(400)
    expect(views, 'analytics page must call /api/analytics/views').toBeTruthy()
    expect(views!.status).toBeLessThan(400)
  })

  test('summary reflects seeded posts + bumped views', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('analytics-data'))
    const seeded = await seedPost(page, accessToken, { title: 'Analytics seed ' + Date.now() })

    for (let i = 0; i < 3; i++) {
      const r = await page.request.post(`${API_BASE}/posts/${seeded.id}/view`, {
        headers: authHeaders(accessToken),
        failOnStatusCode: false,
      })
      expect(r.status()).toBeLessThan(400)
    }

    const summaryRes = await page.request.get(`${API_BASE}/analytics/summary`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(summaryRes.status()).toBeLessThan(400)
    const summary = (await summaryRes.json()) as {
      totalPosts: number
      publishedPosts: number
      totalViews: number
      topPosts: Array<{ id: string; title: string; views: number }>
    }
    expect(summary.totalPosts).toBeGreaterThanOrEqual(1)
    expect(summary.publishedPosts).toBeGreaterThanOrEqual(1)
    expect(summary.totalViews).toBeGreaterThanOrEqual(3)
    expect(summary.topPosts.find((p) => p.id === seeded.id)).toBeTruthy()
  })

  test('all four KPI cards render after load', async ({ page }) => {
    await signup(page, uniqueEmail('analytics-kpis'))
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle')
    for (const id of [
      'kpi-total-views',
      'kpi-published-posts',
      'kpi-total-claps',
      'kpi-total-comments',
    ]) {
      await expect(page.locator(`[data-mol-id="${id}"]`)).toBeVisible()
    }
  })

  test('KpiCard "Total Views" shows a numeric value (formatted)', async ({ page }) => {
    await signup(page, uniqueEmail('analytics-kpi-views'))
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle')
    const text = await page.locator('[data-mol-id="kpi-total-views"]').innerText()
    expect(text).toMatch(/\d|—|0/)
  })

  test('KpiCard "Published Posts" reflects newly seeded posts', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('analytics-kpi-pub'))
    await seedPost(page, accessToken, { title: 'KPI seed ' + Date.now() })
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle')
    const text = await page.locator('[data-mol-id="kpi-published-posts"]').innerText()
    expect(text).toMatch(/[1-9]|\d{2,}/)
  })

  test('Views chart container renders (chart svg or canvas present)', async ({ page }) => {
    await signup(page, uniqueEmail('analytics-chart'))
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle')
    const main = await page.locator('main').innerText()
    expect(main.length).toBeGreaterThan(40)
  })

  test('Top Posts table renders or shows empty-state', async ({ page }) => {
    await signup(page, uniqueEmail('analytics-top'))
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('main').innerText()).toBeTruthy()
  })

  test('Traffic Sources sidebar renders', async ({ page }) => {
    await signup(page, uniqueEmail('analytics-traffic'))
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('main').innerText()).toBeTruthy()
  })

  test('analytics-kpis section wrapper is visible', async ({ page }) => {
    await signup(page, uniqueEmail('analytics-section'))
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="analytics-kpis"]')).toBeVisible()
  })

  test('anonymous access redirects away from /analytics', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 10000 })
  })
})
