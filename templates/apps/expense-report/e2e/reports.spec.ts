import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  seedExpense,
  seedReport,
  signup,
  submitReport,
} from './_helpers.js'

async function createSubmittedReport(
  page: import('@playwright/test').Page,
  accessToken: string,
): Promise<string> {
  const expense = await seedExpense(page, accessToken, { amount: 42.5, merchant: 'Test Cafe' })
  const report = await seedReport(page, accessToken, {
    title: 'Test Report',
    expense_ids: [expense.id],
  })
  await submitReport(page, accessToken, report.id, 'manager+test@example.com')
  return report.id
}

test.describe('/reports page (detail)', () => {
  test('Recoup brand link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('link', { name: /recoup/i }).first()).toBeVisible()
  })

  test('Sidebar Dashboard link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.locator('a[href="/dashboard"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })

  test('Sidebar Expenses link routes to /expenses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.locator('a[href="/expenses"]').first().click()
    await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 5000 })
  })

  test('Sidebar Reports link is the active route', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(
      page.locator('aside a[href="/reports"], nav a[href="/reports"]').first(),
    ).toBeVisible()
  })

  test('Sidebar Report Library link routes to /reports/list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.locator('a[href="/reports/list"]').first().click()
    await page.waitForURL('**/reports/list', { timeout: 5000 })
  })

  test('Sidebar Approvals link routes to /approvals', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.locator('a[href="/approvals"]').first().click()
    await page.waitForURL('**/approvals', { timeout: 5000 })
  })

  test('Activity link routes to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.locator('a[href="/notifications"]').first().click()
    await page.waitForURL('**/notifications', { timeout: 5000 })
  })

  test('Settings link routes to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.locator('a[href="/settings"]').first().click()
    await page.waitForURL('**/settings', { timeout: 5000 })
  })

  test('Open user menu opens a menu with sign out', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    await menu.click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible({
      timeout: 4000,
    })
  })

  test('Back to reports link routes to /reports/list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await page.locator('a[href="/reports/list"]').first().click()
    await page.waitForURL('**/reports/list', { timeout: 5000 })
  })

  test('Export CSV link points to /api/reports/:id/export.csv', async ({ page }) => {
    const { accessToken } = await signup(page)
    const reportId = await createSubmittedReport(page, accessToken)
    await page.goto(APP_BASE + `/reports?id=${reportId}`)
    const csvLink = page.locator('[data-mol-id="report-export"]').first()
    await expect(csvLink).toBeVisible()
    const href = await csvLink.getAttribute('href')
    expect(href).toMatch(/\/api\/reports\/[\w-]+\/export\.csv$/)
  })

  test('About Recoup link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('link', { name: /about\s*recoup/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })

  test('Language footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })

  test('hits /api/reports/:id with a valid uuid in the query string', async ({ page }) => {
    const { accessToken } = await signup(page)
    const reportId = await createSubmittedReport(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/reports?id=${reportId}`)
      await page.waitForLoadState('networkidle')
    })
    const detail = reqs.find(
      (r) => r.method === 'GET' && /\/api\/reports\/[\w-]+(?!\/export)/.test(r.url),
    )
    expect(detail, `GET /api/reports/${reportId}`).toBeTruthy()
    expect(detail?.status).toBeLessThan(400)
  })
})
