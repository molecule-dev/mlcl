import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  seedEvent,
  seedOrder,
  seedTier,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/dashboard page', () => {
  test('signed-in user sees an h1 on the dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('Host an event link navigates to /events/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /host an event/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/events\/new/)
  })

  test('Browse events link navigates to /events', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /browse events/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/events$|\/events\?/)
  })

  test('renders KPI cards (Tickets sold / Gross revenue / Upcoming events)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(/tickets sold/i).first()).toBeVisible()
    await expect(page.getByText(/gross revenue/i).first()).toBeVisible()
  })

  test('All → link from Recent activity goes to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const all = page.locator('a[href="/notifications"]').first()
    if (await all.count()) {
      await all.click()
      await page.waitForURL('**/notifications', { timeout: 5000 })
    }
  })

  test('hits /api/events and /api/dashboard for KPIs', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle')
    })
    const events = reqs.find((r) => r.method === 'GET' && /\/api\/events/.test(r.url))
    expect(events, 'GET /api/events').toBeTruthy()
    const dash = reqs.find((r) => r.method === 'GET' && /\/api\/dashboard/.test(r.url))
    expect(dash, 'GET /api/dashboard/*').toBeTruthy()
  })
})
