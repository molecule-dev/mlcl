/**
 * /analytics — writing-activity dashboard.
 *
 * Real outcomes: GET /api/analytics returns the expected payload shape;
 * each KPI tile and section heading renders even for a fresh user
 * (empty-state copy where appropriate, never a hard error).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, captureNetwork, signup } from './_helpers.js'

test.describe('/analytics', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('h1 reads "Analytics"', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByRole('heading', { name: /^Analytics$/i, level: 1 })).toBeVisible()
  })

  test('GET /api/analytics returns the expected shape on initial render', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/analytics')
      await expect(page.getByRole('heading', { name: /^Analytics$/i, level: 1 })).toBeVisible()
    })
    const req = reqs.find((r) => /\/api\/analytics(\?|$)/.test(r.url) && r.method === 'GET')
    expect(req?.status).toBe(200)
    const data = await authedGet<{
      totals: any
      series: any[]
      topArticles: any[]
      trafficSources: any[]
      geography: any[]
    }>(page, '/analytics')
    expect(data.totals).toBeDefined()
    expect(Array.isArray(data.series)).toBe(true)
    expect(Array.isArray(data.topArticles)).toBe(true)
  })

  test('Total words KPI renders', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByText(/Total words/i)).toBeVisible()
  })

  test('Published KPI renders', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    // KPI card spans wrap an aria-hidden material-symbol glyph + label
    // text with no whitespace, so textContent reads "check_circlePublished".
    // Use bare substring match.
    await expect(page.getByText(/Published/i).first()).toBeVisible()
  })

  test('Drafts KPI renders', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByText(/Drafts/i).first()).toBeVisible()
  })

  test('Avg read time KPI renders', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByText(/Avg read time/i)).toBeVisible()
  })

  test('Writing activity section renders', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByRole('heading', { name: /Writing activity/i, level: 2 })).toBeVisible()
  })

  test('Top articles by length section renders', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await expect(
      page.getByRole('heading', { name: /Top articles by length/i, level: 2 }),
    ).toBeVisible()
  })

  test('Traffic sources section renders', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByRole('heading', { name: /Traffic sources/i, level: 2 })).toBeVisible()
  })

  test('Reader geography section renders', async ({ page }) => {
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByRole('heading', { name: /Reader geography/i, level: 2 })).toBeVisible()
  })
})
