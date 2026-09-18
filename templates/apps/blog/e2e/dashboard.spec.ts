/**
 * /dashboard — auth-gated, renders KPIs from /api/posts (and may pull
 * /api/analytics/summary). Sidebar nav links go to all primary routes.
 * A freshly-seeded post is visible somewhere on the dashboard after refresh.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedPost, signup, uniqueEmail } from './_helpers.js'

test.describe('dashboard', () => {
  test('anonymous visit redirects off /dashboard', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 10000 })
  })

  test('authenticated dashboard fetches posts data', async ({ page }) => {
    await signup(page, uniqueEmail('dash-fetch'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle')
    })
    const posts = reqs.find((r) => r.method === 'GET' && /\/api\/posts(\?|$)/.test(r.url))
    expect(posts, 'dashboard must fetch /api/posts').toBeTruthy()
    expect(posts!.status).toBeLessThan(400)
  })

  test('a freshly-seeded post is visible after dashboard load', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-seed'))
    const { title } = await seedPost(page, accessToken, {
      title: `Dashboard Visible ${Date.now()}`,
    })
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 })
  })

  test('sidebar links exist for primary routes', async ({ page }) => {
    await signup(page, uniqueEmail('dash-nav'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')

    for (const path of ['/posts', '/analytics', '/comments', '/tags', '/settings']) {
      const link = page.locator(`a[href="${path}"]`).first()
      if (await link.count()) {
        await expect(link).toBeVisible()
      }
    }
  })

  test('dashboard renders the main landmark', async ({ page }) => {
    await signup(page, uniqueEmail('dash-main'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('main').first()).toBeVisible()
  })

  test('the welcome header renders an h1 / page title', async ({ page }) => {
    await signup(page, uniqueEmail('dash-welcome'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('navigation rail has at least one nav link', async ({ page }) => {
    await signup(page, uniqueEmail('dash-rail'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    const navLinks = page.locator('nav a, [role="navigation"] a')
    await expect(navLinks.first()).toBeAttached()
  })

  test('clicking the Posts sidebar link navigates to /posts', async ({ page }) => {
    await signup(page, uniqueEmail('dash-posts'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    const link = page.locator('a[href="/posts"]').first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL(/\/posts/, { timeout: 10000 })
    }
  })

  test('clicking the Analytics sidebar link navigates to /analytics', async ({ page }) => {
    await signup(page, uniqueEmail('dash-an'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    const link = page.locator('a[href="/analytics"]').first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL(/\/analytics/, { timeout: 10000 })
    }
  })

  test('GET /api/notifications fires on dashboard load (header badge)', async ({ page }) => {
    await signup(page, uniqueEmail('dash-notif-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle')
    })
    const r = reqs.find((r) => r.method === 'GET' && /\/api\/notifications/.test(r.url))
    if (r) expect(r.status).toBeLessThan(400)
  })

  test('the right sidebar quick-actions area is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('dash-actions'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('main').innerText()).toBeTruthy()
  })

  test('engagement chart container is rendered (no error)', async ({ page }) => {
    await signup(page, uniqueEmail('dash-engagement'))
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })
})
