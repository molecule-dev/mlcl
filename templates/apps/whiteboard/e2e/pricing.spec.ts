import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { api, APP_BASE, captureNetwork } from './_helpers'

test.describe('/pricing — public plan-comparison page', () => {
  test('renders pricing tier cards from /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(page.locator('[data-mol-id^="pricing-tier-"]').first()).toBeVisible({
        timeout: 10_000,
      })
    })
    expect(
      reqs.some((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url) && r.status < 400),
      `expected GET /api/billing/tiers — saw ${JSON.stringify(reqs.slice(0, 3))}`,
    ).toBe(true)
  })

  test('public access — does not require auth', async ({ page, context }) => {
    await context.clearCookies()
    const resp = await page.goto(APP_BASE + '/pricing')
    expect(resp?.status()).toBeLessThan(500)
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('GET /api/billing/tiers returns at least one tier with key + name', async ({ page }) => {
    const tiers = await api<Array<{ key: string; name: string }>>(page, 'GET', '/billing/tiers')
    expect(Array.isArray(tiers)).toBe(true)
    expect(tiers.length).toBeGreaterThan(0)
    expect(tiers[0].key).toBeTruthy()
    expect(tiers[0].name).toBeTruthy()
  })
})
