/**
 * /pricing — public marketing page rendered by `<PricingPage>`. Lists the
 * three live tiers (Free / Pro / Team) loaded from /api/billing/tiers,
 * with per-tier limits derived from the live tier matrix.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork } from './_helpers.js'

test.describe('pricing page', () => {
  test('renders all three live tiers (free, pro, team)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/^free$/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/^pro$/i).first()).toBeVisible()
    await expect(page.getByText(/^team$/i).first()).toBeVisible()
  })

  test('initial mount fetches /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(page.getByText(/^free$/i).first()).toBeVisible({ timeout: 10_000 })
    })
    const tiersCall = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')
    expect(tiersCall, 'GET /api/billing/tiers on mount').toBeTruthy()
    expect(tiersCall?.status, 'tiers status').toBe(200)
  })

  test('tiers payload exposes stripePriceId on the paid tiers', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(res.status()).toBe(200)
    const { data: tiers } = (await res.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const pro = tiers.find((t) => t.key === 'pro')
    const team = tiers.find((t) => t.key === 'team')
    const proPriceId = pro?.prices.find((p) => p.stripePriceId)?.stripePriceId
    const teamPriceId = team?.prices.find((p) => p.stripePriceId)?.stripePriceId
    if (!proPriceId || !teamPriceId) {
      // Unconfigured env: the tiers contract still holds — both paid tiers
      // exist with a null price (the documented unconfigured state the UI
      // renders "Current plan" for). Assert the contract, never skip.
      expect(pro, 'pro tier present').toBeDefined()
      expect(team, 'team tier present').toBeDefined()
      for (const p of [...(pro?.prices ?? []), ...(team?.prices ?? [])]) {
        expect(p.stripePriceId).toBeNull()
      }
      return
    }
    expect(proPriceId).toMatch(/^price_/)
    expect(teamPriceId).toMatch(/^price_/)
  })
})
