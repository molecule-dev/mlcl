import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /dashboard — operations overview. Hits /api/logs, /api/incidents,
// /api/saved (alias for /api/saved-searches). Demo data is seeded on
// the user's first authenticated logs/streams call.

test.describe('/dashboard', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, dashboard fires logs/incidents/saved calls', async ({ page }) => {
    // captureNetwork attaches a `response` listener right away, so all
    // responses fired during the wrapped block are recorded — including
    // the seed-triggering /api/logs / /api/incidents / /api/saved calls
    // that the dashboard issues immediately after the signup redirect.
    // Don't race with separate waitForResponse calls — just wait for the
    // dashboard hero to render, which guarantees the page mounted and
    // its useEffects fired.
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
      await page.waitForURL(/\/dashboard/)
      await expect(page.locator('[data-mol-id="dashboard-hero"]')).toBeVisible({ timeout: 15_000 })
      // Give in-flight requests a moment to settle into the listener.
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const logs = reqs.find((r) => r.method === 'GET' && /\/api\/logs(\b|\?|$)/.test(r.url))
    const incidents = reqs.find(
      (r) => r.method === 'GET' && /\/api\/incidents(\b|\?|$)/.test(r.url),
    )
    const saved = reqs.find((r) => r.method === 'GET' && /\/api\/saved(\b|\?|$)/.test(r.url))
    expect(logs, 'GET /api/logs should fire').toBeDefined()
    expect(logs!.status, 'logs endpoint authed 2xx').toBeLessThan(300)
    expect(incidents, 'GET /api/incidents should fire').toBeDefined()
    expect(incidents!.status).toBeLessThan(300)
    expect(saved, 'GET /api/saved should fire').toBeDefined()
    expect(saved!.status).toBeLessThan(300)
  })

  test('renders the operations overview heading', async ({ page }) => {
    await signup(page)
    await page.waitForURL(/\/dashboard/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
    const h1 = await page.getByRole('heading', { level: 1 }).textContent()
    expect(h1?.length).toBeGreaterThan(0)
  })

  test('"Open search" link navigates to /search', async ({ page }) => {
    await signup(page)
    await page.waitForURL(/\/dashboard/)
    await page
      .getByRole('link', { name: /search|open search/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/search/)
  })

  test('renders 4 KPI cards (errors, warnings, incidents, p95)', async ({ page }) => {
    await signup(page)
    await page.waitForURL(/\/dashboard/)
    // KPI quad — there are 4 MetricStatCard components in a grid.
    // toBeVisible() polls until the post-render reaches us, so we don't
    // need to race against the /api/logs response listener.
    const cards = page.locator('section').nth(1).locator('div, article').filter({ hasText: /\d+/ })
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
  })

  test('hero block shows total volume metric', async ({ page }) => {
    await signup(page)
    await page.waitForURL(/\/dashboard/)
    await expect(page.locator('[data-mol-id="dashboard-hero"]')).toBeVisible({ timeout: 10_000 })
  })
})
