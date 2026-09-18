/**
 * /privacy, /terms, /help — public marketing pages that must render with
 * non-empty content even for anonymous visitors. /not-a-real-route falls
 * back to the SPA root.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('static pages', () => {
  for (const path of ['/privacy', '/terms', '/help']) {
    test(`anonymous visitor can read ${path}`, async ({ page }) => {
      await page.evaluate(() => window.localStorage.clear()).catch(() => {})
      await page.goto(APP_BASE + path)
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(new RegExp(path))
      const text = await page.locator('main, body').first().innerText()
      expect(text.trim().length, `${path} must render non-empty content`).toBeGreaterThan(80)
    })
  }

  test('unknown route falls through to / (or /login if logged out)', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/this-route-does-not-exist')
    await page.waitForLoadState('networkidle')
    // SPA Routes config has <Route path="*" element={<Navigate to="/" replace />} />
    // which when unauthenticated will then bounce to /login via AuthGuard.
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 10000 })
  })
})

test.describe('pricing page', () => {
  test('renders the three tiers from /api/billing/tiers (or hardcoded copy)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const text = (await page.locator('body').innerText()).toLowerCase()
    // At minimum, a working pricing page lists multiple plan names.
    const hits = ['free', 'pro', 'enterprise', 'starter', 'business', 'team'].filter((kw) =>
      text.includes(kw),
    )
    expect(
      hits.length,
      'pricing page must list multiple recognizable tiers',
    ).toBeGreaterThanOrEqual(2)
  })
})
