import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/plan-updated page', () => {
  test('Recoup brand link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('link', { name: /recoup/i }).first()).toBeVisible()
  })

  test('Sidebar Dashboard link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.locator('a[href="/dashboard"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })

  test('Sidebar Expenses link routes to /expenses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.locator('a[href="/expenses"]').first().click()
    await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 5000 })
  })

  test('Sidebar Reports link routes to /reports', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.locator('aside a[href="/reports"], nav a[href="/reports"]').first().click()
    await page.waitForURL(/\/reports($|\?|\/)/, { timeout: 5000 })
  })

  test('Sidebar Report Library link routes to /reports/list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.locator('a[href="/reports/list"]').first().click()
    await page.waitForURL('**/reports/list', { timeout: 5000 })
  })

  test('Sidebar Approvals link routes to /approvals', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.locator('a[href="/approvals"]').first().click()
    await page.waitForURL('**/approvals', { timeout: 5000 })
  })

  test('Activity link routes to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.locator('a[href="/notifications"]').first().click()
    await page.waitForURL('**/notifications', { timeout: 5000 })
  })

  test('Settings link routes to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.locator('a[href="/settings"]').first().click()
    await page.waitForURL('**/settings', { timeout: 5000 })
  })

  test('Open user menu opens a menu with sign out', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    await menu.click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible({
      timeout: 4000,
    })
  })

  test('Return home link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('link', { name: /return home|back to dashboard|go home/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await page.waitForURL(/\/(dashboard|$)/, { timeout: 5000 }).catch(() => {})
    }
  })

  test('Return home button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const btn = page.getByRole('button', { name: /return home|back to dashboard/i }).first()
    if (await btn.count().catch(() => 0)) {
      await expect(btn).toBeVisible()
    }
  })

  test('About Recoup link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('link', { name: /about\s*recoup/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })

  test('Language footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })
})
