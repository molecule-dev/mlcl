import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork } from './_helpers.js'

interface TierRow {
  key?: string
  planKey?: string
  name: string
  prices: Array<{ stripePriceId: string | null; period?: string; price?: string }>
  limits?: Record<string, number | boolean>
}

test.describe('/pricing (public)', () => {
  test('renders without auth and shows the three tier cards from /api/billing/tiers', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(page.locator('[data-mol-id="pricing-page"]')).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('[data-mol-id="pricing-tier-free"]')).toBeVisible({
        timeout: 10_000,
      })
      await expect(page.locator('[data-mol-id="pricing-tier-pro"]')).toBeVisible()
      await expect(page.locator('[data-mol-id="pricing-tier-team"]')).toBeVisible()
    })
    const tiersCall = reqs.find(
      (r) => r.method === 'GET' && /\/api\/billing\/tiers(\?|$)/.test(r.url),
    )
    expect(tiersCall, 'GET /api/billing/tiers must fire when /pricing mounts').toBeDefined()
    expect(tiersCall!.status).toBe(200)
  })

  test('the API returns Pro and Team tiers with at least one Stripe price ID each', async ({
    page,
  }) => {
    const resp = await page.request.get(API_BASE + '/billing/tiers')
    expect(resp.status()).toBe(200)
    const body = (await resp.json()) as { data: TierRow[] }
    const tiers = body.data ?? []
    const pro = tiers.find((t) => (t.key ?? t.planKey) === 'pro')
    const team = tiers.find((t) => (t.key ?? t.planKey) === 'team')
    expect(pro, 'pro tier must be in /api/billing/tiers').toBeTruthy()
    expect(team, 'team tier must be in /api/billing/tiers').toBeTruthy()
    expect(
      pro!.prices.some(
        (p) => typeof p.stripePriceId === 'string' && p.stripePriceId.startsWith('price_'),
      ),
      'pro must have a real Stripe price ID',
    ).toBe(true)
    expect(
      team!.prices.some(
        (p) => typeof p.stripePriceId === 'string' && p.stripePriceId.startsWith('price_'),
      ),
      'team must have a real Stripe price ID',
    ).toBe(true)
  })

  test('per-tier limit readout reflects the API response for advancedFeatures', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-tier-free"]')).toBeVisible({ timeout: 15_000 })
    const free = page.locator('[data-mol-id="pricing-tier-free"]')
    // Free tier shows '—' for advanced features (limits.advancedFeatures = false)
    await expect(free).toContainText('—')
    const pro = page.locator('[data-mol-id="pricing-tier-pro"]')
    // Pro tier shows '✓' for advanced features
    await expect(pro).toContainText('✓')
  })
})
