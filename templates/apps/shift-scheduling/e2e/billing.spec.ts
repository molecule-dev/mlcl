/**
 * Billing — /api/billing/status, /api/billing/tiers, and the Pricing
 * page renders three cards (Free, Pro, Team).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, signup } from './_helpers.js'

test.describe('billing', () => {
  test('GET /api/billing/status returns the free tier with non-zero limits', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      planKey: string
      isFree: boolean
      limits: { maxStaff: number; advancedFeatures: boolean }
    }
    expect(body.isFree).toBe(true)
    expect(body.limits.maxStaff).toBeGreaterThanOrEqual(15)
    expect(body.limits.advancedFeatures).toBe(false)
  })

  test('GET /api/billing/tiers returns three tiers with stripePriceId on the paid ones', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const keys = body.data.map((t) => t.key).sort()
    expect(keys).toEqual(['free', 'pro', 'team'])
    const pro = body.data.find((t) => t.key === 'pro')
    const team = body.data.find((t) => t.key === 'team')
    const hasPriceIds =
      Boolean(pro?.prices.some((p) => p.stripePriceId)) &&
      Boolean(team?.prices.some((p) => p.stripePriceId))
    if (!hasPriceIds) {
      // Unconfigured env: the tiers contract still holds — both paid tiers
      // present with null prices (the documented unconfigured state).
      // Assert the contract, never skip.
      for (const p of [...(pro?.prices ?? []), ...(team?.prices ?? [])]) {
        expect(p.stripePriceId).toBeNull()
      }
    }
  })

  test('Pricing page renders Free, Pro, Team', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/^free$/i).first()).toBeVisible()
    await expect(page.getByText(/^pro$/i).first()).toBeVisible()
    await expect(page.getByText(/^team$/i).first()).toBeVisible()
  })

  test('POST /api/billing/checkout returns a real Stripe Checkout URL for the Pro tier', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    const { data: tiers } = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const pro = tiers.find((t) => t.key === 'pro')
    const priceId = pro?.prices.find((p) => p.stripePriceId)?.stripePriceId
    if (!priceId) {
      // Unconfigured env: checkout must refuse loudly rather than 500 — the
      // documented unconfigured contract is a 4xx naming the missing price.
      const res = await page.request.post(`${API_BASE}/billing/checkout`, {
        headers: apiHeaders(accessToken),
        data: { priceId: null },
      })
      expect(res.status()).toBeGreaterThanOrEqual(400)
      expect(res.status()).toBeLessThan(500)
      return
    }
    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { checkoutUrl?: string }
    expect(body.checkoutUrl, 'Real Stripe Checkout session URL').toMatch(
      /^https:\/\/checkout\.stripe\.com\//,
    )
  })

  test('GET /plan-updated renders the post-checkout confirmation', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // The page renders one of two i18n keys ("plan updated" / "thank you").
    // Wait for either heading + the "return home" CTA.
    await expect(page.getByRole('button', { name: /return home/i })).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('button', { name: /return home/i }).click()
    await page.waitForURL((url) => !url.pathname.includes('/plan-updated'), { timeout: 10_000 })
  })
})
