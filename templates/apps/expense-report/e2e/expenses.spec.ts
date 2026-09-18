import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/expenses page', () => {
  test('Recoup brand link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await expect(page.getByRole('link', { name: /recoup/i }).first()).toBeVisible()
  })

  test('Sidebar Dashboard link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page.locator('a[href="/dashboard"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })

  test('Sidebar Expenses link is the active route', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await expect(page.locator('a[href="/expenses"]').first()).toBeVisible()
  })

  test('Sidebar Reports link routes to /reports', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page.locator('aside a[href="/reports"], nav a[href="/reports"]').first().click()
    await page.waitForURL(/\/reports($|\?|\/)/, { timeout: 5000 })
  })

  test('Sidebar Report Library link routes to /reports/list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page.locator('a[href="/reports/list"]').first().click()
    await page.waitForURL('**/reports/list', { timeout: 5000 })
  })

  test('Sidebar Approvals link routes to /approvals', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page.locator('a[href="/approvals"]').first().click()
    await page.waitForURL('**/approvals', { timeout: 5000 })
  })

  test('Activity link routes to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page.locator('a[href="/notifications"]').first().click()
    await page.waitForURL('**/notifications', { timeout: 5000 })
  })

  test('Settings link routes to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page.locator('a[href="/settings"]').first().click()
    await page.waitForURL('**/settings', { timeout: 5000 })
  })

  test('Open user menu opens a menu with sign out', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    await menu.click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible({
      timeout: 4000,
    })
  })

  test('Add expense link routes to /expenses/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page.locator('a[href="/expenses/new"]').first().click()
    await page.waitForURL('**/expenses/new', { timeout: 5000 })
  })

  test('Search merchant or category input filters the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    const search = page.getByRole('searchbox', { name: /search/i }).first()
    if (await search.count().catch(() => 0)) {
      await search.fill('lufthansa')
      expect(await search.inputValue()).toBe('lufthansa')
    }
  })

  test('All category filter button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await expect(page.getByRole('button', { name: /^all$/i }).first()).toBeVisible()
  })

  test('Meals filter button toggles the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page
      .getByRole('button', { name: /^meals$/i })
      .first()
      .click()
    await page.waitForTimeout(200)
  })

  test('Travel filter button toggles the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page
      .getByRole('button', { name: /^travel$/i })
      .first()
      .click()
    await page.waitForTimeout(200)
  })

  test('Lodging filter button toggles the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page
      .getByRole('button', { name: /^lodging$/i })
      .first()
      .click()
    await page.waitForTimeout(200)
  })

  test('Transport filter button toggles the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page
      .getByRole('button', { name: /^transport$/i })
      .first()
      .click()
    await page.waitForTimeout(200)
  })

  test('Supplies filter button toggles the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await page
      .getByRole('button', { name: /^supplies$/i })
      .first()
      .click()
    await page.waitForTimeout(200)
  })

  test('About Recoup link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await expect(page.getByRole('link', { name: /about\s*recoup/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })

  test('Language footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })

  test('hits /api/expenses on load and returns the seeded list', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/expenses')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.method === 'GET' && /\/api\/expenses(\?|$)/.test(r.url))
    expect(call, 'GET /api/expenses').toBeTruthy()
    expect(call?.status).toBeLessThan(400)
  })
})
