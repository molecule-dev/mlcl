import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup } from './_helpers.js'

test.describe('helpdesk-ticketing: billing & tiers', () => {
  test('public /api/billing/tiers exposes free / pro / team plans with helpdesk limits', async ({
    page,
  }) => {
    const res = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      data: Array<{
        key: string
        name: string
        prices: Array<{ period: string; price: string; stripePriceId: string | null }>
        limits: Record<string, unknown>
      }>
    }
    const keys = body.data.map((t) => t.key).sort()
    expect(keys).toEqual(['free', 'pro', 'team'])

    const free = body.data.find((t) => t.key === 'free')!
    expect(free.limits.maxOpenTickets).toBeDefined()
    expect(free.limits.maxAgents).toBeDefined()

    const pro = body.data.find((t) => t.key === 'pro')!
    const proMonthly = pro.prices.find((p) => p.period === 'month')
    expect(proMonthly?.stripePriceId).toMatch(/^price_/)
  })

  test('authed /api/billing/status returns the current user plan', async ({ page }) => {
    const session = await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: authHeaders(session.accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      planKey: string
      isFree: boolean
      limits: { maxOpenTickets: number }
    }
    expect(body.planKey).toBe('free')
    expect(body.isFree).toBe(true)
    expect(body.limits.maxOpenTickets).toBeGreaterThan(0)
  })

  test('POST /api/billing/checkout returns a real Stripe checkout URL for the Pro Monthly price', async ({
    page,
  }) => {
    const session = await signup(page)

    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`)
    const tiers = (await tiersRes.json()) as {
      data: Array<{
        key: string
        prices: Array<{ period: string; stripePriceId: string | null }>
      }>
    }
    const pro = tiers.data.find((t) => t.key === 'pro')!
    const proMonthlyId = pro.prices.find((p) => p.period === 'month')?.stripePriceId
    expect(proMonthlyId, 'STRIPE_HELPDESK_TICKETING_PRO_MONTHLY must be configured').toMatch(
      /^price_/,
    )

    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(session.accessToken),
      data: { priceId: proMonthlyId },
    })
    expect(res.status(), await res.text().catch(() => '')).toBe(200)
    const body = (await res.json()) as { checkoutUrl?: string; updated?: boolean }
    expect(body.checkoutUrl ?? '').toMatch(/^https:\/\/checkout\.stripe\.com\//)
  })

  test('POST /api/billing/checkout rejects unknown price IDs', async ({ page }) => {
    const session = await signup(page)
    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(session.accessToken),
      data: { priceId: 'price_does_not_exist_at_stripe' },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/billing/cancel without an active subscription returns 4xx, not 5xx', async ({
    page,
  }) => {
    const session = await signup(page)
    const res = await page.request.post(`${API_BASE}/billing/cancel`, {
      headers: authHeaders(session.accessToken),
      failOnStatusCode: false,
    })
    expect(res.status()).toBeLessThan(500)
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('public pricing page renders without an authed user', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('billing endpoints require auth', async ({ page }) => {
    const status = await page.request.get(`${API_BASE}/billing/status`, { failOnStatusCode: false })
    expect(status.status()).toBe(401)

    const checkout = await page.request.post(`${API_BASE}/billing/checkout`, {
      data: { priceId: 'price_x' },
      failOnStatusCode: false,
    })
    expect(checkout.status()).toBe(401)
  })
})
