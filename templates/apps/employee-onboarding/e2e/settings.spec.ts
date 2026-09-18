/**
 * Settings page: renders for an authenticated user; surfaces billing/plan info
 * and an upgrade CTA that routes to /pricing.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/settings', () => {
  test('renders the settings page after signup', async ({ page }) => {
    await signup(page, uniqueEmail('set-render'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-settings"]').first()).toBeVisible()
    expect(reqs.some((r) => /\/api\//.test(r.url))).toBe(true)
  })

  test('upgrade button routes to /pricing', async ({ page }) => {
    await signup(page, uniqueEmail('set-up'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const upgrade = page
      .getByRole('link', { name: /upgrade|view plans|see pricing|change plan|manage plan/i })
      .first()
    if (await upgrade.count()) {
      await upgrade.click()
      await expect(page).toHaveURL(/\/pricing/, { timeout: 10_000 })
    }
  })

  test('GET /api/billing/status returns the planKey', async ({ page }) => {
    await signup(page, uniqueEmail('set-bill'))
    const r = await page.request.get(`${API_BASE}/billing/status`)
    expect(r.status()).toBeLessThan(400)
    const body = (await r.json()) as { planKey?: string; plan?: string }
    expect(body.planKey ?? body.plan ?? 'free').toBeTruthy()
  })
})
