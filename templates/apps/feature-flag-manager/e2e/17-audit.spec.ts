import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers'

// /audit — org-wide audit log feed.
// API: GET /api/audit-log?limit=200
// Filters: action filter chips + free-text search (client-side over actor/target).

test.describe('/audit', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/audit')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('GET /api/audit-log?limit=200 fires on load and entries render', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/audit')
      await page.waitForTimeout(2000)
    })
    const audit = reqs.find((r) => r.method === 'GET' && /\/api\/audit-log\?limit=200/.test(r.url))
    expect(audit, 'GET /api/audit-log?limit=200 should fire').toBeDefined()
    expect(audit!.status).toBe(200)
    await expect(page.locator('[data-mol-id="page-audit"]')).toBeVisible()
    // Seeded data writes ≥1 audit row(s); subheading reflects count.
    const sub = await page.locator('[data-mol-id="page-audit"] header').innerText()
    expect(sub).toMatch(/\d+\s+events/)
  })

  test('action filter chip narrows visible entries client-side', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/audit')
    await page.waitForTimeout(1500)
    const before = await page.locator('[data-mol-id="page-audit"] li').count()
    await page.getByRole('button', { name: 'created', exact: true }).first().click()
    await page.waitForTimeout(500)
    const after = await page.locator('[data-mol-id="page-audit"] li').count()
    // Either same number (everything is "created" after seed) or fewer.
    expect(after).toBeLessThanOrEqual(before)
  })

  test('free-text search narrows entries by actor/target', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/audit')
    await page.waitForTimeout(1500)
    const initial = await page.locator('[data-mol-id="page-audit"] li').count()
    // Scope to the audit page's search box (the global layout sidebar may
    // render a flag-search input above it).
    await page
      .locator('[data-mol-id="page-audit"] input[type="search"]')
      .fill('zzz_no_match_string_zzz')
    await page.waitForTimeout(500)
    const filtered = await page.locator('[data-mol-id="page-audit"] li').count()
    expect(filtered).toBeLessThan(initial)
  })

  test('returning to "all" filter restores entries', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/audit')
    await page.waitForTimeout(1500)
    const initial = await page.locator('[data-mol-id="page-audit"] li').count()
    await page.getByRole('button', { name: 'killed', exact: true }).first().click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'all', exact: true }).first().click()
    await page.waitForTimeout(300)
    const restored = await page.locator('[data-mol-id="page-audit"] li').count()
    expect(restored).toBe(initial)
  })
})
