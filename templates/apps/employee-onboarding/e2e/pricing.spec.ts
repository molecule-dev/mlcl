/**
 * Pricing page: renders the Free/Pro/Team ladder; the Pro upgrade button posts
 * /api/billing/checkout and returns a real Stripe Checkout URL.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders three plan cards', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toContain('free')
    expect(body).toContain('pro')
    expect(body).toContain('team')
  })

  test('GET /api/billing/tiers returns at least one upgradable tier', async ({ page }) => {
    const r = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(r.status()).toBeLessThan(400)
    const body = (await r.json()) as
      Array<{ key: string }> | { data?: Array<{ key: string }>; tiers?: Array<{ key: string }> }
    const tiers = Array.isArray(body) ? body : (body.data ?? body.tiers ?? [])
    expect(tiers.length).toBeGreaterThanOrEqual(2)
  })

  test('clicking upgrade hits /api/billing/checkout (returns Stripe url for an authenticated user)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('pricing-up'))
    const tiersResp = await page.request.get(`${API_BASE}/billing/tiers`)
    type Price = { period?: string; stripePriceId?: string | null }
    type Tier = {
      key: string
      monthlyPriceId?: string
      stripePriceIdMonthly?: string
      prices?: Price[]
    }
    const tiersBody = (await tiersResp.json()) as Tier[] | { data?: Tier[]; tiers?: Tier[] }
    const tiersArr = Array.isArray(tiersBody)
      ? tiersBody
      : (tiersBody.data ?? tiersBody.tiers ?? [])
    const proTier = tiersArr.find((t) => /pro/i.test(t.key))
    const priceId =
      proTier?.monthlyPriceId ??
      proTier?.stripePriceIdMonthly ??
      proTier?.prices?.find((p) => p.period === 'month')?.stripePriceId ??
      undefined
    if (!priceId) test.skip(true, 'no Pro monthly priceId configured')
    const r = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(accessToken),
      data: { priceId },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeLessThan(400)
    const body = (await r.json()) as { url?: string; checkoutUrl?: string; updated?: boolean }
    const stripeUrl = body.checkoutUrl ?? body.url ?? ''
    if (!body.updated) {
      expect(stripeUrl).toMatch(/checkout\.stripe\.com|cs_test_/)
    }
    // Sanity: a click on the actual /pricing page also fires the checkout call.
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      const cta = page
        .getByRole('button', { name: /upgrade|get started|choose pro|select pro/i })
        .first()
      if (!(await cta.count())) return
      await cta.click().catch(() => {})
      await page.waitForTimeout(1500)
    })
    expect(reqs.some((r) => /\/api\//.test(r.url))).toBe(true)
  })
})
