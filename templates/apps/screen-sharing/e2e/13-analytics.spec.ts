import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  createRecording,
  signup,
} from './_helpers.js'

test.describe('analytics /analytics', () => {
  test('page loads and renders heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/analytics|engagement|how your screencasts/i).first()).toBeVisible()
  })

  test('captureNetwork sees GET /api/analytics/overview', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/analytics')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => /\/api\/analytics\/overview/.test(r.url) && r.method === 'GET')
    expect(call?.status).toBe(200)
  })

  test('overview returns the expected zero shape for new accounts', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/analytics/overview`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      totalRecordings: number
      totalViews: number
      heatmap: number[]
      trend7d: number[]
      topRecordings: unknown[]
      recentViewers: unknown[]
    }
    expect(body.totalRecordings).toBe(0)
    expect(body.totalViews).toBe(0)
    expect(body.heatmap).toHaveLength(24)
    expect(body.trend7d).toHaveLength(7)
    expect(body.topRecordings).toEqual([])
    expect(body.recentViewers).toEqual([])
  })

  test('totalRecordings counts created recordings', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createRecording(page, accessToken, { title: 'A1' })
    await createRecording(page, accessToken, { title: 'A2' })
    const res = await page.request.get(`${API_BASE}/analytics/overview`, {
      headers: authHeaders(accessToken),
    })
    const body = (await res.json()) as {
      totalRecordings: number
      topRecordings: { title: string }[]
    }
    expect(body.totalRecordings).toBeGreaterThanOrEqual(2)
    expect(body.topRecordings.length).toBeGreaterThanOrEqual(2)
  })

  test('heatmap renders 24 buckets in the API response', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createRecording(page, accessToken, { title: 'H' })
    const res = await page.request.get(`${API_BASE}/analytics/overview`, {
      headers: authHeaders(accessToken),
    })
    const body = (await res.json()) as { heatmap: number[] }
    expect(body.heatmap).toHaveLength(24)
  })

  test('UI surfaces real recording counts', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createRecording(page, accessToken, { title: 'Hero' })
    await page.goto(APP_BASE + '/analytics')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/Hero/).first()).toBeVisible({ timeout: 10_000 })
  })
})
