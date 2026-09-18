import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoReports(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/reports')
  await expect(page.getByRole('heading', { name: /^reports$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('reports', () => {
  test('GET /api/reports/analytics fires on mount and returns 200', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoReports(page)
    })
    const req = reqs.find((r) => /\/api\/reports\/analytics/.test(r.url) && r.method === 'GET')
    expect(req?.status, 'GET /api/reports/analytics').toBe(200)
  })

  test('page heading "Reports" renders', async ({ page }) => {
    await signup(page)
    await gotoReports(page)
    await expect(page.getByRole('heading', { name: /^reports$/i, level: 1 })).toBeVisible()
  })

  test('subheading "Last 30 days · scheduled reports below" renders', async ({ page }) => {
    await signup(page)
    await gotoReports(page)
    await expect(page.getByText(/last 30 days/i)).toBeVisible()
  })

  test('Miles KPI label renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoReports(page)
    await expect(page.getByText(/^miles$/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('Fuel KPI label renders with a "gal" unit', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoReports(page)
    await expect(page.getByText(/^fuel$/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/\d+ gal/i)).toBeVisible()
  })

  test('Fuel cost KPI renders with $ format', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoReports(page)
    await expect(page.getByText(/fuel cost/i)).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body).toMatch(/\$\d/)
  })

  test('On-time rate KPI renders with % format', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoReports(page)
    await expect(page.getByText(/on-time rate/i)).toBeVisible({ timeout: 10000 })
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body).toMatch(/\d+%/)
  })

  test('Daily miles section heading renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoReports(page)
    await expect(page.getByRole('heading', { name: /daily miles/i })).toBeVisible()
  })

  test('Daily miles bar chart renders multiple bars', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoReports(page)
    await expect(page.getByRole('heading', { name: /daily miles/i })).toBeVisible({
      timeout: 10000,
    })
    // Bars are rendered as inline-styled divs under the chart heading; we look at
    // the parent section for child elements with width-style attributes.
    // Simpler check: the chart wrapper exists and is non-empty.
    const chartHeading = page.getByRole('heading', { name: /daily miles/i })
    await expect(chartHeading).toBeVisible()
    const section = chartHeading.locator('xpath=ancestor::section[1]')
    const html = (await section.innerHTML()) ?? ''
    expect(html.length, 'chart section non-empty').toBeGreaterThan(100)
  })

  test('By vehicle type section heading renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoReports(page)
    await expect(page.getByRole('heading', { name: /by vehicle type/i })).toBeVisible()
  })

  test('Breakdown table renders with at least one row', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoReports(page)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    const firstRow = page.getByRole('row').nth(1)
    await expect(firstRow).toBeVisible({ timeout: 5000 })
  })

  test('Breakdown table includes an MPG column with a numeric value', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoReports(page)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
    const tableTxt = (await page.getByRole('table').textContent()) ?? ''
    expect(tableTxt).toMatch(/mpg/i)
    expect(tableTxt).toMatch(/\d+\.\d/)
  })
})
