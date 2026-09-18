import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('08: routing — landing, 404, auth-guarded routes', () => {
  test('landing page renders public CTA buttons', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('domcontentloaded')
    // Sign-in link
    await expect(page.locator('a[href="/login"]').first()).toBeVisible()
    // Sign-up link
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible()
  })

  test('unknown route renders the 404 page', async ({ page }) => {
    await page.goto(APP_BASE + '/this-route-does-not-exist')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=/404|not\\s*found/i').first()).toBeVisible()
  })

  test('logged-in user can navigate every primary route', async ({ page }) => {
    await signup(page)
    const routes = [
      { path: '/dashboard', testid: 'dashboard' },
      { path: '/entries', testid: 'entries-page' },
      { path: '/timesheet', testid: 'timesheet-page' },
      { path: '/projects', testid: undefined, marker: /Color-coded engagements|new project/i },
      { path: '/clients', testid: undefined, marker: /every relationship|new client/i },
      { path: '/reports', testid: 'reports-page' },
      { path: '/invoices', testid: 'invoices-page' },
      { path: '/settings', testid: 'settings-page' },
    ] as const

    for (const route of routes) {
      await page.goto(APP_BASE + route.path)
      await page.waitForLoadState('domcontentloaded')
      if (route.testid) {
        await expect(page.locator(`[data-test=${route.testid}]`)).toBeVisible({ timeout: 10000 })
      } else if ('marker' in route && route.marker) {
        await expect(page.locator('main').first()).toContainText(route.marker, { timeout: 10000 })
      }
    }
  })
})
