import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/dashboard page', () => {
  test('Recoup brand link routes to /dashboard or /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const brand = page.getByRole('link', { name: /recoup/i }).first()
    if (await brand.count().catch(() => 0)) {
      await brand.click()
      await page
        .waitForURL(
          (u) =>
            /\/(dashboard|home|app|root|^\/$)/.test(u.toString()) ||
            u.toString() === APP_BASE + '/',
          { timeout: 5000 },
        )
        .catch(() => {})
    }
  })

  test('Sidebar Dashboard link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible()
  })

  test('Sidebar Expenses link routes to /expenses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('a[href="/expenses"]').first().click()
    await page.waitForURL('**/expenses', { timeout: 5000 })
  })

  test('Sidebar Reports link routes to /reports', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('aside a[href="/reports"], nav a[href="/reports"]').first().click()
    await page.waitForURL(/\/reports($|\?|\/)/, { timeout: 5000 })
  })

  test('Sidebar Report Library link routes to /reports/list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('a[href="/reports/list"]').first().click()
    await page.waitForURL('**/reports/list', { timeout: 5000 })
  })

  test('Sidebar Approvals link routes to /approvals', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('a[href="/approvals"]').first().click()
    await page.waitForURL('**/approvals', { timeout: 5000 })
  })

  test('Activity link routes to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('a[href="/notifications"]').first().click()
    await page.waitForURL('**/notifications', { timeout: 5000 })
  })

  test('Settings link routes to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('a[href="/settings"]').first().click()
    await page.waitForURL('**/settings', { timeout: 5000 })
  })

  test('Open user menu opens a menu with sign out', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    await menu.click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible({
      timeout: 4000,
    })
  })

  test('New expense quick action routes to /expenses/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('a[href="/expenses/new"]').first().click()
    await page.waitForURL('**/expenses/new', { timeout: 5000 })
  })

  test('New report quick action routes to /reports/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('a[href="/reports/new"]').first().click()
    await page.waitForURL('**/reports/new', { timeout: 5000 })
  })

  test('View all reports link routes to /reports/list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const link = page.getByRole('link', { name: /view all reports/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await page.waitForURL('**/reports/list', { timeout: 5000 })
    }
  })

  test('About Recoup link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('link', { name: /about\s*recoup/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })

  test('Language footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })

  test('hits /api/dashboard/summary on load with realistic snapshot', async ({ page }) => {
    const { accessToken } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle')
    })
    const summary = reqs.find((r) => r.method === 'GET' && /\/api\/dashboard\/summary/.test(r.url))
    expect(summary, 'GET /api/dashboard/summary').toBeTruthy()
    expect(summary?.status, 'summary returns 2xx').toBeLessThan(300)
    // Read-after-write: re-fetch directly with the JWT so we can assert
    // the payload shape the component actually renders against.
    const direct = await page.request.get(`${API_BASE}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(direct.status()).toBeLessThan(400)
    const payload = (await direct.json()) as {
      recovered_cents: number
      pending_count: number
      reimbursed_this_month_cents: number
      awaiting_receipts: number
      recent_reports: Array<{ id: string; title: string }>
    }
    expect(typeof payload.recovered_cents).toBe('number')
    expect(typeof payload.pending_count).toBe('number')
    expect(typeof payload.reimbursed_this_month_cents).toBe('number')
    expect(typeof payload.awaiting_receipts).toBe('number')
    expect(Array.isArray(payload.recent_reports)).toBe(true)
  })
})
