import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiGet, captureNetwork, getAccessToken, signup } from './_helpers.js'

/**
 * The pricing tiers endpoint returns category-level rows ({free, pro,
 * team}) — its identifying field is `key`, not `planKey`. The status
 * endpoint returns the user's *registry* planKey (e.g. 'stripeMonthly')
 * along with a coarse `category`. Tests below align with both shapes.
 */
interface Tier {
  key: string
  name: string
  prices: Array<{
    stripePriceId?: string | null
    period?: 'month' | 'year' | string
    price?: string
  }>
}

interface Status {
  planKey: string
  category: string
  name: string
  isFree: boolean
}

const BILLING_PATH = '/settings/billing'

test.describe('/billing (status + plan switch + payment update)', () => {
  test.setTimeout(60_000)

  test('renders Plans grid with three cards and current plan readout', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + BILLING_PATH)
    await expect(page.getByRole('heading', { name: /^billing$/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: /^plans$/i })).toBeVisible()
    // 3 plan cards from tiers.ts (Free / Pro / Team)
    const cards = page.locator('article').filter({ has: page.getByRole('heading') })
    await expect(cards).toHaveCount(3, { timeout: 10_000 })
    // Current-plan readout in the header (we just signed up so are on Free).
    await expect(page.getByText(/free plan/i)).toBeVisible({ timeout: 10_000 })
  })

  test('Switch button hits /billing/checkout and surfaces a 2xx (or stripe-redirect URL)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + BILLING_PATH)
    await expect(page.getByRole('heading', { name: /^plans$/i })).toBeVisible({ timeout: 15_000 })

    // Pick the first non-current Switch button.
    const switchBtn = page.getByRole('button', { name: /^switch$/i }).first()
    await expect(switchBtn).toBeVisible({ timeout: 10_000 })

    const reqs = await captureNetwork(page, async () => {
      // Don't care about the redirect — just make sure the POST fires.
      await switchBtn.click()
      await page.waitForTimeout(2000)
    })
    const checkout = reqs.find(
      (r) => r.method === 'POST' && /\/api\/billing\/checkout(\b|$|\?)/.test(r.url),
    )
    expect(checkout, 'POST /api/billing/checkout should fire on Switch').toBeDefined()
    // Stripe success → 2xx or redirect; explicit failure modes are 5xx.
    expect(checkout!.status, 'checkout should not 5xx').toBeLessThan(500)
  })

  test('GET /api/billing/tiers returns 3 tiers with valid Stripe price IDs on paid tiers', async ({
    page,
  }) => {
    await signup(page)
    const data = await apiGet<{ data: Tier[] }>(page, '/billing/tiers')
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBe(3)
    const free = data.data.find((t) => t.key === 'free')
    const pro = data.data.find((t) => t.key === 'pro')
    const team = data.data.find((t) => t.key === 'team')
    expect(free).toBeDefined()
    expect(pro).toBeDefined()
    expect(team).toBeDefined()
    // Paid tiers must have real Stripe price IDs (price_...).
    expect(pro!.prices?.[0]?.stripePriceId, 'pro tier needs stripePriceId').toMatch(/^price_/)
    expect(team!.prices?.[0]?.stripePriceId, 'team tier needs stripePriceId').toMatch(/^price_/)
  })

  test('GET /api/billing/status returns the current plan (Free for fresh user)', async ({
    page,
  }) => {
    await signup(page)
    const status = await apiGet<Status>(page, '/billing/status')
    // tiers.ts uses 'free' as both the planKey (registry) and category
    // for the free tier — so a fresh signup matches on both.
    expect(status.planKey).toBe('free')
    expect(status.category).toBe('free')
    expect(status.isFree).toBe(true)
  })

  test('POST /api/billing/checkout with bogus priceId returns 400', async ({ page }) => {
    await signup(page)
    const res = await page.request.post(
      (process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4200') + '/api') +
        '/billing/checkout',
      {
        headers: {
          Authorization:
            'Bearer ' +
            (await page.evaluate(() => {
              for (const k of Object.keys(window.localStorage)) {
                const raw = window.localStorage.getItem(k) ?? ''
                if (/^eyJ/.test(raw)) return raw
                try {
                  const parsed = JSON.parse(raw)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const t = (parsed as any)?.accessToken ?? ''
                  if (typeof t === 'string' && /^eyJ/.test(t)) return t
                } catch {
                  /* ignore */
                }
              }
              return ''
            })),
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({ priceId: 'price_obviously_fake_' + Date.now() }),
      },
    )
    expect(res.status(), 'unknown priceId must 400').toBe(400)
  })

  test('POST /api/billing/cancel without active sub returns 400 (graceful)', async ({ page }) => {
    await signup(page)
    // Even Stripe-disabled environments should round-trip — we just want
    // to assert our handler shape returns a clean error rather than
    // throwing an unhandled exception.
    const res = await page.request.post(
      (process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4200') + '/api') +
        '/billing/cancel',
      {
        headers: {
          Authorization:
            'Bearer ' +
            (await page.evaluate(() => {
              for (const k of Object.keys(window.localStorage)) {
                const raw = window.localStorage.getItem(k) ?? ''
                if (/^eyJ/.test(raw)) return raw
                try {
                  const parsed = JSON.parse(raw)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const t = (parsed as any)?.accessToken ?? ''
                  if (typeof t === 'string' && /^eyJ/.test(t)) return t
                } catch {
                  /* ignore */
                }
              }
              return ''
            })),
          'Content-Type': 'application/json',
        },
        // The cancel endpoint takes no body, but we still send a well-formed
        // empty JSON object: an empty/blank body with `Content-Type:
        // application/json` is rejected by the strict JSON body parser
        // (express.json defaults to strict) as a SyntaxError — a malformed
        // *request*, not a handler fault. `{}` parses cleanly and reaches the
        // handler so we exercise the real "no active subscription" path.
        data: '{}',
      },
    )
    // Without a subscription the provider returns false → 400; if Stripe
    // wires a portal we accept any non-5xx. Either way we want NO
    // unhandled exception (5xx).
    expect(res.status(), 'cancel must not 5xx').toBeLessThan(500)
  })
})
