import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, createGroupViaApi, getGroupDetail, signup } from './_helpers.js'

test.describe('/dashboard page', () => {
  test('Evenly sidebar brand is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-mol-id="sidebar-brand"]')).toBeVisible()
  })

  test('balance summary cards render with a net position', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-mol-id="dashboard-balance-cards"]')).toBeVisible()
    // Three cards: you owe, owed to you, net.
    await expect(page.locator('[data-mol-id="dashboard-balance-cards"] > div')).toHaveCount(3)
  })

  test('every group the API returns appears as a row', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Create one more group so the list is provably non-seed-dependent.
    await createGroupViaApi(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    const groups = await page.request
      .get(API_BASE + '/groups', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
    expect(Array.isArray(groups)).toBe(true)
    expect((groups as { id: string }[]).length).toBeGreaterThan(0)
    for (const group of groups as { id: string }[]) {
      await expect(page.locator(`[data-mol-id="dashboard-group-${group.id}"]`)).toBeVisible()
    }
  })

  test('a group row links to its detail page', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator(`[data-mol-id="dashboard-group-${group.id}"]`).click()
    await page.waitForURL(new RegExp(`\\/groups\\/${group.id}`), { timeout: 5000 })
  })

  test('Add expense CTA routes to /expenses/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('[data-mol-id="dashboard-add-expense"]').click()
    await page.waitForURL('**/expenses/new', { timeout: 5000 })
  })

  test('sidebar Balances link routes to /balances', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('aside a[href="/balances"], nav a[href="/balances"]').first().click()
    await page.waitForURL('**/balances', { timeout: 5000 })
  })

  test('sidebar Groups link routes to /groups', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('aside a[href="/groups"], nav a[href="/groups"]').first().click()
    await page.waitForURL(/\/groups($|\?)/, { timeout: 5000 })
  })

  test('Open user menu opens a menu with sign out', async ({ page }) => {
    // Expected 4xx: the shared settings panel probes GET /api/billing/status,
    // and bill-split deliberately ships no billing routes (see api/src/App/
    // router.ts) — Chrome logs the 404s as console errors.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    await menu.click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible({
      timeout: 4000,
    })
  })

  test('group balances sum to zero in the seeded world', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-mol-id="page-dashboard"]')).toBeVisible()
    // The invariant this app exists for: read each group from the API and
    // assert its member nets sum to exactly zero.
    const groups = (await page.request
      .get(API_BASE + '/groups', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())) as { id: string }[]
    for (const group of groups) {
      const detail = await getGroupDetail(page, accessToken, group.id)
      const total = detail.balances.reduce((sum, b) => sum + b.net_cents, 0)
      expect(total, `group ${group.id} nets sum to zero`).toBe(0)
    }
  })
})
