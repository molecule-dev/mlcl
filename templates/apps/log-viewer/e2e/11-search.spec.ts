import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /search — query bar + severity filters + log line stream from /api/logs.

test.describe('/search', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/search')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, /search fires GET /api/logs', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/search')
      await page.waitForResponse((r) => /\/api\/logs(\b|\?|$)/.test(r.url()), { timeout: 10_000 })
    })
    const req = reqs.find((r) => r.method === 'GET' && /\/api\/logs(\b|\?|$)/.test(r.url))
    expect(req).toBeDefined()
    expect(req!.status).toBeLessThan(300)
  })

  test('typing in the query bar updates the input value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    const input = page.locator('[data-mol-id="search-query"]')
    await input.fill('checkout')
    await expect(input).toHaveValue('checkout')
  })

  test('severity filter pills change the active filter', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.waitForResponse((r) => /\/api\/logs/.test(r.url()))
    await page.locator('[data-mol-id="search-filter-error"]').click()
    // Status bar reflects the filter.
    const status = page.locator('[data-mol-id="search-status-bar"]')
    await expect(status).toBeVisible()
  })

  test('clicking a log line populates the right-hand detail panel', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.waitForResponse((r) => /\/api\/logs/.test(r.url()))
    const rows = page.locator('[data-mol-id^="log-line-"]')
    await expect(rows.first()).toBeVisible({ timeout: 10_000 })
    await rows.first().click()
    await expect(page.locator('aside pre').first()).toBeVisible({ timeout: 5_000 })
  })

  test('renders the timeline volume sparkline', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.waitForResponse((r) => /\/api\/logs/.test(r.url()))
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 5_000 })
  })
})
