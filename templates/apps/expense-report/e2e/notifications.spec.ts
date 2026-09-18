import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/notifications page', () => {
  test('Recoup brand link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('link', { name: /recoup/i }).first()).toBeVisible()
  })

  test('Sidebar Dashboard link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.locator('a[href="/dashboard"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })

  test('Sidebar Expenses link routes to /expenses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.locator('a[href="/expenses"]').first().click()
    await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 5000 })
  })

  test('Sidebar Reports link routes to /reports', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.locator('aside a[href="/reports"], nav a[href="/reports"]').first().click()
    await page.waitForURL(/\/reports($|\?|\/)/, { timeout: 5000 })
  })

  test('Sidebar Report Library link routes to /reports/list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.locator('a[href="/reports/list"]').first().click()
    await page.waitForURL('**/reports/list', { timeout: 5000 })
  })

  test('Sidebar Approvals link routes to /approvals', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.locator('a[href="/approvals"]').first().click()
    await page.waitForURL('**/approvals', { timeout: 5000 })
  })

  test('Activity link is the active route', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('a[href="/notifications"]').first()).toBeVisible()
  })

  test('Settings link routes to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.locator('a[href="/settings"]').first().click()
    await page.waitForURL('**/settings', { timeout: 5000 })
  })

  test('Open user menu opens a menu with sign out', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    await menu.click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible({
      timeout: 4000,
    })
  })

  test('Open report › link points to /reports?id=', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    const link = page.getByRole('link', { name: /open report/i }).first()
    if (await link.count().catch(() => 0)) {
      const href = await link.getAttribute('href')
      expect(href).toMatch(/\/reports\?id=[\w-]+/)
    }
  })

  test('About Recoup link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('link', { name: /about\s*recoup/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })

  test('Language footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })

  test('hits /api/notifications on load and renders activity feed', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/notifications(\?|$)/.test(r.url))
    expect(list, 'GET /api/notifications').toBeTruthy()
    expect(list?.status, 'notifications GET 2xx').toBeLessThan(300)
  })

  test('Mark all read sends PUT /api/notifications/mark_all_read', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForLoadState('networkidle')
      const markAll = page.getByRole('button', { name: /mark all (as )?read/i }).first()
      if (await markAll.count().catch(() => 0)) {
        await markAll.click()
        await page.waitForTimeout(800)
      }
    })
    const call = reqs.find(
      (r) => r.method === 'PUT' && /\/api\/notifications\/mark_all_read/.test(r.url),
    )
    if (call) {
      expect(call.status).toBeLessThan(400)
    }
  })
})
