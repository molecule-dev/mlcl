import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/insights', () => {
  test('renders heading + 4 DORA KPI tiles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/insights')
    await expect(page.getByRole('heading', { name: /^Insights$/i, level: 1 })).toBeVisible()
    await expect(page.getByText(/Deploys \/ day/i)).toBeVisible()
    await expect(page.getByText(/Lead time/i)).toBeVisible()
    await expect(page.getByText(/Change failure rate/i)).toBeVisible()
    await expect(page.getByText(/MTTR/i)).toBeVisible()
  })

  test('GET /api/insights fires on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/insights')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const get = whereUrl(reqs, /\/api\/insights(?:\?|$)/, 'GET')
    expect(get.length, 'GET /api/insights fired').toBeGreaterThan(0)
    expect(get[0].status).toBe(200)
  })

  test('shows pipeline success rate chart with 14 daily entries', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/insights')
    await expect(page.getByRole('heading', { name: /Pipeline success rate/i })).toBeVisible()
    // Each day's bar carries a title="YYYY-MM-DD: NN.N%" tooltip. Scope to the
    // chart section rather than matching on a year prefix — computeInsights()
    // always emits the last 14 days relative to NOW, whatever year that is.
    const chart = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: /Pipeline success rate/i }) })
      .last()
    await expect(chart.locator('div[title]'), 'chart should render 14 daily bars').toHaveCount(14)
  })

  test('shows slowest pipeline steps section with rows', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/insights')
    await expect(page.getByRole('heading', { name: /Slowest pipeline steps/i })).toBeVisible()
    const rows = page.locator('main >> li').filter({ hasText: /mean .* p95/i })
    await expect(rows.first()).toBeAttached()
  })

  test('KPI numerics are present and non-empty', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/insights')
    // Wait for data to populate (else only labels render with no values)
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    // Each of the 4 KPI tiles should show a numeric value
    const tilesContainer = page.locator('main')
    const text = (await tilesContainer.textContent()) || ''
    // CFR is a percent value
    expect(text, 'CFR percent shown').toMatch(/\d+(?:\.\d+)?%/)
    // MTTR ends in 'm' followed by a non-digit (e.g. "0mPipeline")
    expect(text, 'MTTR shown').toMatch(/MTTR\s*\d+m/i)
    // Lead time ends in 'h' (e.g. "Lead time0.1h")
    expect(text, 'Lead time shown').toMatch(/Lead time\s*\d+(?:\.\d+)?h/i)
    // Deploys / day shows numeric value (e.g. "Deploys / day0.2")
    expect(text, 'Deploys/day shown').toMatch(/Deploys\s*\/\s*day\s*\d+(?:\.\d+)?/i)
  })

  test('reload preserves insights view (state survives reload)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/insights')
    await expect(page.getByRole('heading', { name: /^Insights$/i })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: /^Insights$/i })).toBeVisible()
    await expect(page.getByText(/Deploys \/ day/i)).toBeVisible()
  })
})
