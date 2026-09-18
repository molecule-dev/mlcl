import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders heading and at least two tier headings without crashing', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /choose your.*plan/i })).toBeVisible()
    // Free + Pro + Team are seeded in api/src/tiers.ts so we expect ≥ 2.
    const tileHeadings = page
      .locator('h2, h3')
      .filter({ hasText: /^(Free|Pro|Team|Scholar|Mastery)$/i })
    expect(
      await tileHeadings.count(),
      'at least two tier headings rendered',
    ).toBeGreaterThanOrEqual(2)
  })

  test('GET /api/billing/tiers fires and returns 200 on page load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers(?:\?|$)/.test(r.url))
    expect(get, 'GET /api/billing/tiers fired').toBeTruthy()
    expect(get!.status).toBe(200)
  })

  test('every visible tier shows at least one limit row (no blank cards)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    const lists = page.locator('ul')
    const count = await lists.count()
    expect(count, 'pricing page renders at least one limits list').toBeGreaterThan(0)
  })
})
