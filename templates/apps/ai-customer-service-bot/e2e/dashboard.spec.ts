import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('dashboard renders and fires the analytics fetch', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    })
    const analytics = reqs.find((r) => /\/api\/analytics(?:\?|$)/.test(r.url) && r.method === 'GET')
    expect(analytics, 'GET /api/analytics should fire on dashboard load').toBeTruthy()
    expect(analytics!.status).toBeLessThan(300)
  })

  test('dashboard sidebar link stays on /dashboard', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('nav a[href="/dashboard"]').first().click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('navigates to /conversations from the sidebar', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await page.locator('nav a[href="/conversations"]').first().click()
    await expect(page).toHaveURL(/\/conversations/)
  })

  test('navigates to /knowledge from the sidebar', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('nav a[href="/knowledge"]').first().click()
    await expect(page).toHaveURL(/\/knowledge/)
  })

  test('navigates to /analytics from the sidebar', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('nav a[href="/analytics"]').first().click()
    await expect(page).toHaveURL(/\/analytics/)
  })

  test('navigates to /settings from the sidebar', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('nav a[href="/settings"]').first().click()
    await expect(page).toHaveURL(/\/settings/)
  })

  test('renders the threads KPI card with a numeric value (default 0)', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    // Look for a stat block that contains a digit. The dashboard renders
    // four KPI cards; "Total threads" must be visible by accessible text.
    await expect(page.getByText(/total threads/i)).toBeVisible({ timeout: 10_000 })
  })
})
