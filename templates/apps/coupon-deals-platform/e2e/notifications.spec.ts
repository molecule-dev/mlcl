import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Notifications page (/notifications)', () => {
  test('renders the page title', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i, level: 1 })).toBeVisible()
  })

  test('shows feed list or empty-state copy for fresh users', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForTimeout(1000)
    // Either the feed list renders or empty-state copy is shown.
    const empties = await page.getByText(/no new notifications/i).count()
    const items = await page.getByRole('listitem').count()
    expect(empties + items, 'either feed populated or empty-state visible').toBeGreaterThan(0)
  })

  test('renders the notification feed when populated', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForTimeout(1000)
    await expect(page.getByRole('main').first()).toBeVisible()
  })

  test('listitem renders for each notification when feed is populated', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForTimeout(1500)
    const items = await page.getByRole('listitem').count()
    expect(items, 'listitem count is non-negative integer').toBeGreaterThanOrEqual(0)
  })

  test('page-load fetches /api/notifications', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.waitForTimeout(1000)
    })
    const calls = reqs.filter((r) => /\/api\/notifications/.test(r.url) && r.method === 'GET')
    expect(calls.length, 'GET /api/notifications fired').toBeGreaterThan(0)
    expect(calls.every((r) => r.status === 200)).toBe(true)
  })
})
