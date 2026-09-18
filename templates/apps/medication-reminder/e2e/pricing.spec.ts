import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test.describe('/pricing (Pricing)', () => {
  test('Pricing page renders a heading', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page).toHaveURL(/\/pricing/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })

  test('GET /api/billing/tiers returns at least one tier definition', async ({ page }) => {
    await signup(page)
    const tiers = await api<unknown[]>(page, 'GET', '/billing/tiers')
    expect(Array.isArray(tiers)).toBe(true)
    expect(tiers.length, 'at least one tier defined').toBeGreaterThan(0)
  })

  test('GET /api/billing/status returns a current plan for a fresh user', async ({ page }) => {
    await signup(page)
    const status = await api<Record<string, unknown>>(page, 'GET', '/billing/status')
    expect(status, 'billing status response').toBeTruthy()
  })

  test('Pricing page mount captures /billing/tiers (when authenticated)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForTimeout(800)
    })
    // At least the tiers OR status endpoint should be hit on the pricing page.
    const billingHit = reqs.find((r) => /\/api\/billing\/(tiers|status)/.test(r.url))
    expect(billingHit, 'pricing page should fetch /api/billing/tiers or /status').toBeTruthy()
  })
})
