/**
 * Pricing + checkout invariants. The PricingPage component requires
 * the HTTP client to send `/billing/tiers` requests under the `/api`
 * prefix — without the http-default bond the page renders "—" and
 * crashes on `.map` of undefined. This spec asserts the response shape
 * AND the visible tier names so a regression on the bond wiring is
 * caught immediately.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  captureNetwork,
  listTiers,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('pricing', () => {
  test('GET /api/billing/tiers returns Free / Pro / Team with limits', async ({ page }) => {
    const tiers = await listTiers(page)
    const keys = tiers.map((t) => t.key)
    expect(keys).toContain('free')
    expect(keys).toContain('pro')
    expect(keys).toContain('team')
    for (const t of tiers) {
      expect(t.limits.maxAllergies).toBeDefined()
      expect(t.limits.maxConditions).toBeDefined()
    }
  })

  test('public /pricing page renders all tiers with their prices', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.some((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET' && r.status < 400),
    ).toBe(true)
    const body = await page.locator('body').innerText()
    expect(body).toContain('Free')
    expect(body).toContain('Pro')
    expect(body).toContain('Team')
    expect(body, 'pricing limits must be numeric, not "[object Object]" or empty').toMatch(
      /\d+\s+(allergies|conditions|documents)/i,
    )
  })

  test('authenticated checkout returns a Stripe checkoutUrl', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('checkout'))
    const tiers = await listTiers(page)
    const pro = tiers.find((t) => t.key === 'pro')!
    const monthly = pro.prices.find((p) => p.period === 'month')!
    expect(monthly.stripePriceId).toBeTruthy()
    const r = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(accessToken),
      data: { priceId: monthly.stripePriceId },
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as { checkoutUrl?: string }
    expect(body.checkoutUrl, 'checkout must return a Stripe URL').toMatch(
      /^https:\/\/checkout\.stripe\.com\//,
    )
  })
})
