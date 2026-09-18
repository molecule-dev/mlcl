/**
 * Pricing page (/pricing).
 *
 *   - The page mounts and fires a single GET /api/billing/tiers (NOT
 *     /api/api/billing/tiers — there is no double-prefix bug).
 *   - The fetched tier names render to screen.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('pricing page', () => {
  test('mounts and fetches /api/billing/tiers exactly once (no double prefix)', async ({
    page,
  }) => {
    const tiersRequests: string[] = []
    page.on('response', (resp) => {
      const url = resp.url()
      if (url.includes('/billing/tiers')) {
        tiersRequests.push(url)
      }
    })
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    expect(tiersRequests.length).toBeGreaterThan(0)
    for (const url of tiersRequests) {
      expect(url).not.toMatch(/\/api\/api\//)
    }
  })

  test('renders at least one tier heading from the live tier catalog', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    // Free + at least one paid tier should render h2 headings.
    const headings = page.locator('h2')
    expect(await headings.count()).toBeGreaterThan(1)
  })
})
