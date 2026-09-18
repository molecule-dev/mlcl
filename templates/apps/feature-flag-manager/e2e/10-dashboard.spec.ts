import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, apiFetch, captureNetwork, signup, waitForSeed } from './_helpers'

// /dashboard — Pennant control panel.
// Reads /api/flags + /api/audit-log on load. If /api/flags is empty,
// fires POST /api/seed once which idempotently creates 3 envs, 3 flags,
// 2 segments. Hero shows the "active" count; KPI quad shows Total /
// Active / Stale / Killed; Recent flag changes list (5); audit feed (6).

test.describe('/dashboard', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, dashboard fires GET /api/flags + POST /api/seed and shows seeded data', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      const flagsP = page
        .waitForResponse(
          (r) => /\/api\/flags(\?|$)/.test(r.url()) && r.request().method() === 'GET',
          { timeout: 20_000 },
        )
        .catch(() => null)
      const seedP = page
        .waitForResponse(
          (r) => /\/api\/seed(\?|$)/.test(r.url()) && r.request().method() === 'POST',
          { timeout: 20_000 },
        )
        .catch(() => null)
      await signup(page)
      await page.waitForURL(/\/dashboard/)
      await Promise.all([flagsP, seedP])
      // Wait again for the post-seed flags refetch.
      await page.waitForTimeout(1500)
    })
    const flagsGet = reqs.find((r) => r.method === 'GET' && /\/api\/flags(\?|$)/.test(r.url))
    expect(flagsGet, 'GET /api/flags should fire on dashboard load').toBeDefined()
    expect(flagsGet!.status).toBe(200)
    const seedPost = reqs.find((r) => r.method === 'POST' && /\/api\/seed(\?|$)/.test(r.url))
    expect(seedPost, 'POST /api/seed should fire when flags is empty').toBeDefined()
    expect(seedPost!.status).toBe(200)
    const auditGet = reqs.find((r) => r.method === 'GET' && /\/api\/audit-log/.test(r.url))
    expect(auditGet, 'GET /api/audit-log should fire on dashboard').toBeDefined()
    expect(auditGet!.status).toBe(200)
  })

  test('hero "active" KPI matches the GET /api/flags state="on" count after seed', async ({
    page,
  }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForTimeout(1500)
    // Read API truth.
    const flags = await apiFetch(page, 'GET', '/flags')
    expect(flags.status).toBe(200)
    const arr = (flags.json as Array<{ state: string }> | null) ?? []
    // Non-vacuity guard on the workspace, not on how many flags the starter
    // seed happens to leave switched on.
    expect(arr.length, 'workspace has flags to count').toBeGreaterThan(0)
    const activeApi = arr.filter((f) => f.state === 'on').length
    const heroText = await page.locator('[data-mol-id="dashboard-hero-active"]').textContent()
    expect(parseInt(heroText ?? '-1', 10)).toBe(activeApi)
  })

  test('"All flags →" link in recent panel navigates to /flags', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('a[href="/flags"]').first().click()
    await expect(page).toHaveURL(/\/flags$/)
  })

  test('"View full audit log →" link navigates to /audit', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('a[href="/audit"]').first().click()
    await expect(page).toHaveURL(/\/audit$/)
  })
})
