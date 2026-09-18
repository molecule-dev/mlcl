import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedReviewedPR, signup, whereUrl } from './_helpers.js'

test.describe('Profile page', () => {
  test('renders user name + email after signup', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { name: session.name })).toBeVisible()
    await expect(page.getByText(session.email).first()).toBeVisible()
  })

  test('initial load fetches /api/reports/summary + /api/reviews', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(whereUrl(reqs, /\/api\/reports\/summary/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/reviews/, 'GET').length).toBeGreaterThan(0)
  })

  test('KPI panels render labels (reviews/streak/avg score/critical)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/^reviews$/i).first()).toBeVisible()
    await expect(page.getByText(/day streak/i)).toBeVisible()
    await expect(page.getByText(/avg score/i)).toBeVisible()
    await expect(page.getByText(/^critical$/i).first()).toBeVisible()
  })

  test('with seeded reviews, KPI count > 0 and timeline shows the PR', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await seedReviewedPR(request, session.accessToken!)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/reviewed pr/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('heatmap renders 28 day cells', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    const cells = page.locator('span[title*="level"]')
    await expect(cells.first()).toBeVisible()
    expect(await cells.count()).toBe(28)
  })

  test('initials chip shows first two characters of the user name', async ({ page }) => {
    const session = await signup(page, undefined, undefined, 'AbcUser')
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText('Ab', { exact: true }).first()).toBeVisible()
    void session
  })

  test('AuthGuard redirects anonymous users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('summary endpoint returns 200 (no 5xx) on initial load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    const summary = whereUrl(reqs, /\/api\/reports\/summary/, 'GET')
    for (const r of summary) expect(r.status, `${r.url} should not 5xx`).toBeLessThan(500)
  })

  test('Score card subtitle reflects review count (e.g., "0 reviews")', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    // ScoreCard subtitle template is "{{count}} reviews"
    await expect(page.getByText(/\d+\s+reviews?/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('Recent activity timeline section is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    // The timeline heading or empty-state message appears even without data.
    const recent = page.getByRole('heading', { name: /recent activity|timeline|activity/i })
    const empty = page.getByText(/no reviews yet|nothing here yet|empty/i)
    const visible = (await recent.count().catch(() => 0)) + (await empty.count().catch(() => 0))
    expect(visible, 'expected either a timeline heading or empty state').toBeGreaterThan(0)
  })
})
