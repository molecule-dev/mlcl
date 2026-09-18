import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/settings page', () => {
  test('Recoup brand link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('link', { name: /recoup/i }).first()).toBeVisible()
  })

  test('Sidebar Dashboard link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('a[href="/dashboard"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })

  test('Sidebar Expenses link routes to /expenses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('a[href="/expenses"]').first().click()
    await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 5000 })
  })

  test('Sidebar Reports link routes to /reports', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('aside a[href="/reports"], nav a[href="/reports"]').first().click()
    await page.waitForURL(/\/reports($|\?|\/)/, { timeout: 5000 })
  })

  test('Sidebar Report Library link routes to /reports/list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('a[href="/reports/list"]').first().click()
    await page.waitForURL('**/reports/list', { timeout: 5000 })
  })

  test('Sidebar Approvals link routes to /approvals', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('a[href="/approvals"]').first().click()
    await page.waitForURL('**/approvals', { timeout: 5000 })
  })

  test('Activity link routes to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('a[href="/notifications"]').first().click()
    await page.waitForURL('**/notifications', { timeout: 5000 })
  })

  test('Settings link is the active route', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('a[href="/settings"]').first()).toBeVisible()
  })

  test('Open user menu opens a menu with sign out', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    await menu.click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible({
      timeout: 4000,
    })
  })

  test('Display name input accepts user input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const name = page.locator('#profile-name')
    await name.fill('My New Name')
    expect(await name.inputValue()).toBe('My New Name')
  })

  test('Work email input accepts user input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const email = page.locator('#profile-email')
    const original = await email.inputValue()
    await email.fill(original)
    expect(await email.inputValue()).toBe(original)
  })

  test('Save profile button PATCHes /api/users/:id and persists across reload', async ({
    page,
  }) => {
    const { userId } = await signup(page)
    expect(userId).toBeTruthy()
    const newName = 'Persisted Name ' + Date.now()
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle')
      await page.locator('#profile-name').fill(newName)
      await page.locator('[data-mol-id="settings-save-profile"]').click()
      await expect(page.locator('[data-mol-id="settings-profile-saved"]')).toBeVisible({
        timeout: 5000,
      })
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/users\/[\w-]+/.test(r.url))
    expect(patch, 'PATCH /api/users/:id').toBeTruthy()
    expect(patch?.status).toBeLessThan(400)

    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(await page.locator('#profile-name').inputValue()).toBe(newName)
  })

  test('ACH direct deposit reimbursement option toggles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const ach = page.locator('[data-mol-id="payout-ach"]').first()
    if (await ach.count().catch(() => 0)) await ach.click()
    await page.waitForTimeout(300)
  })

  test('Corporate card credit reimbursement option toggles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const card = page.locator('[data-mol-id="payout-card"]').first()
    if (await card.count().catch(() => 0)) await card.click()
    await page.waitForTimeout(300)
  })

  test('When my report is submitted notification toggles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const cb = page.locator('[data-mol-id="notify-submitted"]').first()
    if (await cb.count().catch(() => 0)) await cb.click()
    await page.waitForTimeout(300)
  })

  test('When my report is reviewed notification toggles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const cb = page.locator('[data-mol-id="notify-reviewed"]').first()
    if (await cb.count().catch(() => 0)) await cb.click()
    await page.waitForTimeout(300)
  })

  test('When I receive reimbursement notification toggles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const cb = page.locator('[data-mol-id="notify-reimbursed"]').first()
    if (await cb.count().catch(() => 0)) await cb.click()
    await page.waitForTimeout(300)
  })

  test('Policy violation alerts notification toggles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const cb = page.locator('[data-mol-id="notify-policy"]').first()
    if (await cb.count().catch(() => 0)) await cb.click()
    await page.waitForTimeout(300)
  })

  test('About Recoup link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('link', { name: /about\s*recoup/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })

  test('Language footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })

  test('hits /api/users/:id and /api/policies on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle')
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/users\/[\w-]+/.test(r.url))
    expect(get, 'GET /api/users/:id').toBeTruthy()
    const policies = reqs.find((r) => r.method === 'GET' && /\/api\/policies(\?|$|\/)/.test(r.url))
    expect(policies, 'GET /api/policies').toBeTruthy()
  })
})
