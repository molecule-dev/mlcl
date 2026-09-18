import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedObjective, signup } from './_helpers.js'

test.describe('Dashboard /dashboard', () => {
  test('fresh signup lands on /dashboard with empty state visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByTestId('dashboard-empty')).toBeVisible()
  })

  test('hero greeting includes the user first name', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    // We supplied "Test User <ts>" as the name — the first token should appear.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/good climbing/i)
  })

  test('Run weekly check-in CTA navigates to /check-in', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /run weekly check-in/i }).click()
    await expect(page).toHaveURL(/\/check-in$/)
  })

  test('hero New objective CTA navigates to /objectives/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /new objective/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/objectives\/new$/)
  })

  test('View all link routes to /objectives', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /view all/i }).click()
    await expect(page).toHaveURL(/\/objectives$/)
  })

  test('See all activity link routes to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /see all activity/i }).click()
    await expect(page).toHaveURL(/\/notifications$/)
  })

  test('initial loads call /api/objectives, /api/key-results, /api/notifications', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const obj = reqs.find((r) => r.method === 'GET' && /\/api\/objectives(\?|$)/.test(r.url))
    const krs = reqs.find((r) => r.method === 'GET' && /\/api\/key-results(\?|$)/.test(r.url))
    const notifs = reqs.find((r) => r.method === 'GET' && /\/api\/notifications(\?|$)/.test(r.url))
    expect(obj, 'expected GET /api/objectives').toBeTruthy()
    expect(krs, 'expected GET /api/key-results').toBeTruthy()
    expect(notifs, 'expected GET /api/notifications').toBeTruthy()
    for (const r of [obj!, krs!, notifs!]) expect(r.status).toBe(200)
  })

  test('Theme toggle flips data-mol-mode AND survives reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const before = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    await page
      .getByRole('button', { name: /toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    expect(after).not.toBe(before)
    expect(['light', 'dark']).toContain(after)
    await page.reload()
    const persisted = await page.evaluate(() => document.documentElement.dataset.molMode || '')
    expect(persisted).toBe(after)
  })

  test('Open user menu reveals Sign out', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('button', { name: /open user menu/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible()
  })

  test('Sign out navigates back to a public page (/login or /)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('button', { name: /open user menu/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()
    await page.waitForURL(/\/(login|)$/, { timeout: 10000 })
  })

  test('Hero copy reflects objective count after seeding one', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedObjective(page, accessToken!, { title: 'Dash hero seed' })
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/good climbing/i)
    // Empty state should now be hidden — at least one objective is present.
    await expect(page.getByTestId('dashboard-empty')).toHaveCount(0)
    await expect(page.locator('main')).toContainText('Dash hero seed')
  })

  test('Search input is visible on the dashboard header', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('input[type="search"]').first()).toBeVisible()
  })
})
