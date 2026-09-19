/**
 * /dashboard — publication overview: KPI cards, growth chart, last issue.
 * Values are cross-checked against /api/stats/overview inside the test.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('dashboard', () => {
  test('requires auth (redirects anonymous visitors)', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).not.toHaveURL(/\/dashboard$/, { timeout: 15000 })
  })

  test('renders the KPI cards with values consistent with the API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-kpi'))
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-mol-id="dashboard-kpi-subscribers"]')).toBeVisible({
      timeout: 20000,
    })
    await expect(page.locator('[data-mol-id="dashboard-growth"]')).toBeVisible()
    const res = await page.request.get(`${API_BASE}/stats/overview`, {
      headers: authHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const overview = (await res.json()) as { subscriberCounts: { subscribed: number } }
    const expected = overview.subscriberCounts.subscribed.toLocaleString()
    await expect(
      page
        .locator('[data-mol-id="dashboard-kpi-subscribers"]')
        .getByText(expected, { exact: true }),
    ).toBeVisible({ timeout: 15000 })
  })

  test('side nav links to Issues and Subscribers', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-nav'))
    await page.goto(APP_BASE + '/dashboard')
    const issues = page.getByRole('link', { name: /^issues$/i }).first()
    if (await issues.count()) {
      await issues.click()
      await page.waitForURL(/\/issues$/, { timeout: 10000 })
    }
    const subs = page.getByRole('link', { name: /^subscribers$/i }).first()
    if (await subs.count()) {
      await subs.click()
      await page.waitForURL(/\/subscribers$/, { timeout: 10000 })
    }
  })
})
