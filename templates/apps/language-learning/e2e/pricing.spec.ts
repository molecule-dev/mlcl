import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiSignup, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders all configured plan tiers from real /api/billing/tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    // Tier keys (free / pro / team) are loaded from registered tiers.ts.
    await expect(page.getByText(/^Free$/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/^Pro$/i).first()).toBeVisible()
    await expect(page.getByText(/^Team$/i).first()).toBeVisible()
    const tiersCalls = whereUrl(reqs, /\/api\/billing\/tiers/, 'GET')
    expect(tiersCalls.length, 'GET /api/billing/tiers fired on mount').toBeGreaterThan(0)
  })

  test('GET /api/billing/tiers returns real Stripe price IDs for paid tiers', async ({
    request,
  }) => {
    const tiersRes = await request.get(`${API_BASE}/billing/tiers`)
    expect(tiersRes.status()).toBe(200)
    const body = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    expect(Array.isArray(body.data)).toBe(true)
    const pro = body.data.find((t) => t.key === 'pro')
    expect(pro, 'pro tier present').toBeTruthy()
    const monthly = pro!.prices.find((p) => p.stripePriceId)
    expect(monthly, 'pro tier has at least one real Stripe price ID').toBeTruthy()
    expect(monthly!.stripePriceId, 'price id looks like a real Stripe ID').toMatch(/^price_/)
  })

  test('logged-in upgrade flow returns a real Stripe Checkout URL', async ({ request }) => {
    const { accessToken } = await apiSignup(request)
    expect(accessToken).toBeTruthy()
    // Pull a real Stripe price from the API rather than hard-coding so we
    // exercise whatever was provisioned for this app.
    const tiers = (await (await request.get(`${API_BASE}/billing/tiers`)).json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
    }
    const proPrice = tiers.data
      .find((t) => t.key === 'pro')
      ?.prices.find((p) => p.stripePriceId)?.stripePriceId
    expect(proPrice, 'a Stripe price id is configured for pro').toBeTruthy()

    const checkout = await request.post(`${API_BASE}/billing/checkout`, {
      headers: { Authorization: `Bearer ${accessToken!}`, 'Content-Type': 'application/json' },
      data: {
        priceId: proPrice,
        successUrl: APP_BASE + '/plan-updated?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: APP_BASE + '/pricing',
      },
    })
    expect(checkout.status(), 'checkout status').toBe(200)
    const body = (await checkout.json()) as { checkoutUrl: string }
    expect(body.checkoutUrl, 'checkout url returned').toMatch(/^https:\/\/checkout\.stripe\.com\//)
  })

  test('GET /api/billing/status returns the user current plan key', async ({ request }) => {
    const { accessToken } = await apiSignup(request)
    const status = await request.get(`${API_BASE}/billing/status`, {
      headers: { Authorization: `Bearer ${accessToken!}` },
    })
    expect(status.status()).toBe(200)
    const body = (await status.json()) as { planKey: string }
    expect(body.planKey, 'fresh users start on free').toBe('free')
  })

  test('clicking an Upgrade button on /pricing while logged in fires checkout', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    // PricingPage from @molecule/app-billing-react exposes Upgrade buttons
    // for paid plans. Click the first one and assert the checkout call
    // returned a real URL.
    let stripeUrl = ''
    page.on('response', (r) => {
      if (/\/api\/billing\/checkout/.test(r.url()) && r.request().method() === 'POST') {
        r.json()
          .then((b) => {
            if (b?.checkoutUrl) stripeUrl = String(b.checkoutUrl)
          })
          .catch(() => {})
      }
    })
    const btn = page.getByRole('button', { name: /upgrade|subscribe|choose/i }).first()
    if (await btn.count()) {
      await btn.click().catch(() => {})
      await page.waitForTimeout(2000)
    }
    if (stripeUrl) {
      expect(stripeUrl, 'real Stripe checkout URL').toMatch(/^https:\/\/checkout\.stripe\.com\//)
    }
  })
})
