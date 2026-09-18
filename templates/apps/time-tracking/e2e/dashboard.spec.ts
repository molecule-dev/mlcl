import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/dashboard page', () => {
  test('dashboard root + greeting heading visible after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-test="dashboard"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /good day/i })).toBeVisible()
  })

  test('top-bar timer renders the start button and idle copy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('button', { name: /start timer/i })).toBeVisible()
    await expect(page.locator('text=/idle — start tracking/i')).toBeVisible()
  })

  test('"What are you working on?" textbox accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const desc = page.getByRole('textbox', { name: /working on/i })
    await desc.fill('Drafting RFP response')
    await expect(desc).toHaveValue('Drafting RFP response')
  })

  test('"View timesheet" link navigates to /timesheet', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /view timesheet/i }).click()
    await expect(page).toHaveURL(/\/timesheet$/)
  })

  test('"View reports" link navigates to /reports', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /view reports/i }).click()
    await expect(page).toHaveURL(/\/reports$/)
  })

  test('KPI cards (Tracked today / This week / Billable / Active projects / Invoiced) all render', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /tracked today/i })).toBeVisible()
    await expect(page.locator('text=/^This week$/i')).toBeVisible()
    await expect(page.locator('text=/billable this week/i')).toBeVisible()
    await expect(page.locator('text=/active projects/i').first()).toBeVisible()
    await expect(page.locator('text=/invoiced this month/i')).toBeVisible()
  })

  test('"View all" link from Recent entries goes to /entries', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /^view all$/i }).click()
    await expect(page).toHaveURL(/\/entries$/)
  })

  test('"Manage" link from Active projects goes to /projects', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /^manage$/i }).click()
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('empty-state copy renders when user has no entries / no projects', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    // newly-signed-up user has no entries → empty banner visible
    await expect(page.locator('[data-test="dashboard-empty"]')).toBeVisible()
    await expect(page.locator('[data-test="dashboard-projects-empty"]')).toBeVisible()
  })

  test('individual KPI: "Tracked today" card renders with HMS default', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /tracked today/i })).toBeVisible()
    await expect(page.locator('text=/00:00:00/').first()).toBeVisible()
  })

  test('individual KPI: "This week" card renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('text=/^This week$/i')).toBeVisible()
  })

  test('individual KPI: "Billable this week" card renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('text=/billable this week/i')).toBeVisible()
  })

  test('individual KPI: "Active projects" card renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('text=/active projects/i').first()).toBeVisible()
  })

  test('individual KPI: "Invoiced this month" card renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('text=/invoiced this month/i')).toBeVisible()
  })

  test('dashboard load fires GET /api/entries and GET /api/projects', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.find((r) => r.method === 'GET' && /\/api\/entries/.test(r.url))).toBeTruthy()
    expect(reqs.find((r) => r.method === 'GET' && /\/api\/projects/.test(r.url))).toBeTruthy()
  })
})
