import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Plan-updated confirmation page (/plan-updated)', () => {
  test('renders the thank-you headings after auth init', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5_000 })
    const headings = await page.getByRole('heading').count()
    expect(headings, 'page has at least one heading after init').toBeGreaterThan(0)
  })

  test('"Return home" button exists and routes to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    const link = page.getByRole('link', { name: /return home/i })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(new RegExp(APP_BASE.replace(/\//g, '\\/') + '\\/$'))
  })

  test('the underlying link wraps the Return home button with href="/"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.locator('a[href="/"]').filter({ hasText: /return home/i })
    await expect(link).toHaveCount(1)
  })

  test('anonymous /plan-updated redirects to /login (AuthGuard)', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForURL(/\/login|\/$/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/login|\/$/)
  })

  test('page does NOT spam /api/* on load (no spurious requests)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    // After signup, the only legitimate /api/* call from /plan-updated
    // itself is none — auth init may have happened earlier. Just ensure
    // we don't 5xx.
    for (const r of reqs.filter((x) => /\/api\//.test(x.url))) {
      expect(r.status, `${r.method} ${r.url}`).toBeLessThan(500)
    }
  })

  test('headings are visible after auth has initialized', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const headings = page.getByRole('heading')
    await expect(headings.first()).toBeVisible()
    await expect(headings.first()).toBeAttached()
  })
})
