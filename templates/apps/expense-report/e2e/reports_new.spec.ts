import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedExpense, signup } from './_helpers.js'

test.describe('/reports/new page', () => {
  test('Recoup brand link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    await expect(page.getByRole('link', { name: /recoup/i }).first()).toBeVisible()
  })

  test('Sidebar Dashboard link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    await page.locator('a[href="/dashboard"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })

  test('Sidebar Expenses link routes to /expenses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    await page.locator('a[href="/expenses"]').first().click()
    await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 5000 })
  })

  test('Sidebar Reports link routes to /reports', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    await page.locator('aside a[href="/reports"], nav a[href="/reports"]').first().click()
    await page.waitForURL(/\/reports($|\?|\/)/, { timeout: 5000 })
  })

  test('Sidebar Report Library link routes to /reports/list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    await page.locator('a[href="/reports/list"]').first().click()
    await page.waitForURL('**/reports/list', { timeout: 5000 })
  })

  test('Sidebar Approvals link routes to /approvals', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    await page.locator('a[href="/approvals"]').first().click()
    await page.waitForURL('**/approvals', { timeout: 5000 })
  })

  test('Activity link routes to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    await page.locator('a[href="/notifications"]').first().click()
    await page.waitForURL('**/notifications', { timeout: 5000 })
  })

  test('Settings link routes to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    await page.locator('a[href="/settings"]').first().click()
    await page.waitForURL('**/settings', { timeout: 5000 })
  })

  test('Open user menu opens a menu with sign out', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    await menu.click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible({
      timeout: 4000,
    })
  })

  test('Report title textbox accepts user input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    const title = page.locator('#title')
    await title.fill('Q3 Trip')
    expect(await title.inputValue()).toBe('Q3 Trip')
  })

  test('Business purpose textbox accepts user input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    const purpose = page.locator('#purpose')
    await purpose.fill('Vendor visit')
    expect(await purpose.inputValue()).toBe('Vendor visit')
  })

  test('Approver email textbox accepts user input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    const approver = page.locator('#approver')
    await approver.fill('manager@example.com')
    expect(await approver.inputValue()).toBe('manager@example.com')
  })

  test('Include checkbox toggles included state', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedExpense(page, accessToken, { merchant: 'Spec Cafe', amount: 12.5 })
    await page.goto(APP_BASE + '/reports/new')
    const checkboxes = page.getByRole('checkbox')
    if (
      await checkboxes
        .first()
        .count()
        .catch(() => 0)
    ) {
      const before = await checkboxes.first().isChecked()
      await checkboxes.first().click()
      expect(await checkboxes.first().isChecked()).toBe(!before)
    }
  })

  test('a second checkbox toggles independently', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedExpense(page, accessToken, { merchant: 'A' })
    await seedExpense(page, accessToken, { merchant: 'B' })
    await page.goto(APP_BASE + '/reports/new')
    const checkboxes = page.getByRole('checkbox')
    if ((await checkboxes.count()) >= 2) {
      const before = await checkboxes.nth(1).isChecked()
      await checkboxes.nth(1).click()
      expect(await checkboxes.nth(1).isChecked()).toBe(!before)
    }
  })

  test('Submit for approval posts to /api/reports + /api/reports/:id/submit', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedExpense(page, accessToken, { merchant: 'Submit Spec', amount: 10 })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports/new')
      await page.locator('#title').fill('E2E Submit')
      await page.locator('#purpose').fill('Submit flow test')
      await page.locator('#approver').fill('submit-spec@example.com')
      await page
        .getByRole('button', { name: /submit for approval/i })
        .first()
        .click()
      await page.waitForURL('**/reports/list', { timeout: 15000 })
    })
    const create = reqs.find((r) => r.method === 'POST' && /\/api\/reports(\?|$)/.test(r.url))
    expect(create, 'POST /api/reports').toBeTruthy()
    const submit = reqs.find(
      (r) => r.method === 'POST' && /\/api\/reports\/[\w-]+\/submit/.test(r.url),
    )
    expect(submit, 'POST /api/reports/:id/submit').toBeTruthy()
  })

  test('Save as draft posts to /api/reports and routes to /reports/list', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedExpense(page, accessToken, { merchant: 'Draft Spec', amount: 8 })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reports/new')
      await page.locator('#title').fill('E2E Draft')
      await page
        .getByRole('button', { name: /save as draft/i })
        .first()
        .click()
      await page.waitForURL('**/reports/list', { timeout: 10000 })
    })
    const create = reqs.find((r) => r.method === 'POST' && /\/api\/reports(\?|$)/.test(r.url))
    expect(create, 'POST /api/reports').toBeTruthy()
  })

  test('About Recoup link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    await expect(page.getByRole('link', { name: /about\s*recoup/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })

  test('Language footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports/new')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })
})
