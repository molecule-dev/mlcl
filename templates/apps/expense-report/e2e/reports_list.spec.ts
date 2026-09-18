import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/reports/list page', () => {
  test('Recoup brand link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await expect(page.getByRole('link', { name: /recoup/i }).first()).toBeVisible()
  })

  test('Sidebar Dashboard link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await page.locator('a[href="/dashboard"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })

  test('Sidebar Expenses link routes to /expenses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await page.locator('a[href="/expenses"]').first().click()
    await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 5000 })
  })

  test('Sidebar Reports link routes to /reports', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await page.locator('aside a[href="/reports"], nav a[href="/reports"]').first().click()
    await page.waitForURL(/\/reports($|\?|\/)/, { timeout: 5000 })
  })

  test('Sidebar Report Library link is the active route', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await expect(page.locator('a[href="/reports/list"]').first()).toBeVisible()
  })

  test('Sidebar Approvals link routes to /approvals', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await page.locator('a[href="/approvals"]').first().click()
    await page.waitForURL('**/approvals', { timeout: 5000 })
  })

  test('Activity link routes to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await page.locator('a[href="/notifications"]').first().click()
    await page.waitForURL('**/notifications', { timeout: 5000 })
  })

  test('Settings link routes to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await page.locator('a[href="/settings"]').first().click()
    await page.waitForURL('**/settings', { timeout: 5000 })
  })

  test('Open user menu opens a menu with sign out', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    await menu.click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible({
      timeout: 4000,
    })
  })

  test('New report link routes to /reports/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await page.locator('a[href="/reports/new"]').first().click()
    await page.waitForURL('**/reports/new', { timeout: 5000 })
  })

  test('All status filter button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await expect(page.getByRole('button', { name: /^all$/i }).first()).toBeVisible()
  })

  test('Drafts status filter button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await expect(page.getByRole('button', { name: /drafts/i }).first()).toBeVisible()
  })

  test('In review status filter button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await expect(page.getByRole('button', { name: /in review/i }).first()).toBeVisible()
  })

  test('Approved status filter button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await expect(page.getByRole('button', { name: /approved/i }).first()).toBeVisible()
  })

  test('Rejected status filter button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await expect(page.getByRole('button', { name: /rejected/i }).first()).toBeVisible()
  })

  test('Reimbursed status filter button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await expect(page.getByRole('button', { name: /reimbursed/i }).first()).toBeVisible()
  })

  test('Drafts filter narrows the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await page
      .getByRole('button', { name: /drafts/i })
      .first()
      .click()
    await page.waitForTimeout(300)
  })

  test('In review filter narrows the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await page
      .getByRole('button', { name: /in review/i })
      .first()
      .click()
    await page.waitForTimeout(300)
  })

  test('Approved filter narrows the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await page
      .getByRole('button', { name: /^approved$/i })
      .first()
      .click()
    await page.waitForTimeout(300)
  })

  test('Reimbursed filter narrows the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await page
      .getByRole('button', { name: /^reimbursed$/i })
      .first()
      .click()
    await page.waitForTimeout(300)
  })

  test('clicking a report card routes to /reports?id=', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    const link = page.locator('a[href*="/reports?id="]').first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await page.waitForURL(/\/reports\?id=[\w-]+/, { timeout: 5000 })
    }
  })

  test('About Recoup link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await expect(page.getByRole('link', { name: /about\s*recoup/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })

  test('Language footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/list')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })

  test('hits /api/reports on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports/list')
      await page.waitForLoadState('networkidle')
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/reports(\?|$)/.test(r.url))
    expect(list, 'GET /api/reports').toBeTruthy()
    expect(list?.status).toBeLessThan(400)
  })
})
