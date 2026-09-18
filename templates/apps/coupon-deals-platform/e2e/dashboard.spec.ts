import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Dashboard page (/dashboard)', () => {
  test('renders the SnagrLayout primary navigation', async ({ page }) => {
    await signup(page)
    await expect(page.getByRole('navigation', { name: /primary navigation/i })).toBeVisible()
  })

  test('user-menu button is rendered in the side rail', async ({ page }) => {
    await signup(page)
    await expect(page.getByRole('button', { name: /open user menu/i })).toBeVisible()
  })

  test('renders the lifetime savings hero figure', async ({ page }) => {
    await signup(page)
    await page.waitForTimeout(1000)
    const node = page.getByText(/lifetime savings/i).first()
    await expect(node).toBeVisible()
  })

  test('renders the redeemed-coupons KPI', async ({ page }) => {
    await signup(page)
    await page.waitForTimeout(1000)
    await expect(page.getByText(/redeemed/i).first()).toBeVisible()
  })

  test('renders the saved-coupons KPI', async ({ page }) => {
    await signup(page)
    await page.waitForTimeout(1000)
    await expect(page.getByText(/saved coupons/i).first()).toBeVisible()
  })

  test('renders the expiring-soon KPI', async ({ page }) => {
    await signup(page)
    await page.waitForTimeout(1000)
    await expect(page.getByText(/expiring/i).first()).toBeVisible()
  })

  test('renders the "Hot deals near you" heading', async ({ page }) => {
    await signup(page)
    await page.waitForTimeout(1000)
    await expect(page.getByRole('heading', { name: /hot deals near you/i, level: 2 })).toBeVisible()
  })

  test('hot-deals row renders at least one deal article', async ({ page }) => {
    await signup(page)
    await page.waitForTimeout(1500)
    expect(await page.locator('article').count()).toBeGreaterThanOrEqual(1)
  })

  test('"View all" deals link navigates to /deals', async ({ page }) => {
    await signup(page)
    await page.getByRole('link', { name: 'View all' }).first().click()
    await expect(page).toHaveURL(/\/deals$/)
  })

  test('renders the "Top-saving merchants" heading', async ({ page }) => {
    await signup(page)
    await page.waitForTimeout(1000)
    await expect(
      page.getByRole('heading', { name: /top-saving merchants/i, level: 2 }),
    ).toBeVisible()
  })

  test('renders the "Recent activity" heading', async ({ page }) => {
    await signup(page)
    await page.waitForTimeout(1000)
    await expect(page.getByRole('heading', { name: /recent activity/i, level: 2 })).toBeVisible()
  })

  test('"See all" link navigates to /notifications', async ({ page }) => {
    await signup(page)
    await page.getByRole('link', { name: 'See all' }).first().click()
    await expect(page).toHaveURL(/\/notifications$/)
  })

  test('page-load fetches /api/reports/dashboard_stats and /api/deals', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForTimeout(1500)
    })
    const stats = reqs.filter(
      (r) => /\/api\/reports\/dashboard_stats/.test(r.url) && r.method === 'GET',
    )
    const deals = reqs.filter((r) => /\/api\/deals(\?|$)/.test(r.url) && r.method === 'GET')
    expect(stats.length, 'dashboard_stats fired').toBeGreaterThan(0)
    expect(deals.length, 'deals fired').toBeGreaterThan(0)
    expect(
      stats.every((r) => r.status === 200),
      'all stats returned 200',
    ).toBe(true)
    expect(
      deals.every((r) => r.status === 200),
      'all deals returned 200',
    ).toBe(true)
  })
})
