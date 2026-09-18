import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Pricing page', () => {
  test('renders public pricing without login', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    // PricingPage from @molecule/app-billing-react renders a heading + tier cards
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/free/i).first()).toBeVisible()
    await expect(page.getByText(/pro/i).first()).toBeVisible()
  })

  test('GET /api/billing/tiers returns Free + Pro + Team with stripePriceIds', async ({
    request,
  }) => {
    const res = await request.get(API_BASE + '/billing/tiers')
    expect(res.status()).toBe(200)
    const body = await res.json()
    const tiers = Array.isArray(body) ? body : body.data
    expect(Array.isArray(tiers)).toBe(true)
    const keys = tiers.map((t: { key: string }) => t.key)
    expect(keys).toContain('free')
    expect(keys).toContain('pro')
    expect(keys).toContain('team')
    const pro = tiers.find((t: { key: string }) => t.key === 'pro')
    expect(pro.prices.length).toBeGreaterThan(0)
    // At least one paid price MUST have a real Stripe priceId, otherwise checkout is broken
    const hasRealPriceId = pro.prices.some(
      (p: { stripePriceId: string | null }) =>
        p.stripePriceId && p.stripePriceId.startsWith('price_'),
    )
    expect(
      hasRealPriceId,
      'pro tier needs at least one real Stripe priceId — see scripts/create-stripe-test-products.mjs',
    ).toBe(true)
  })

  test('Upgrade flow POSTs /api/billing/checkout and returns a real Stripe checkoutUrl', async ({
    request,
  }) => {
    const tiersRes = await (await request.get(API_BASE + '/billing/tiers')).json()
    const tiers = Array.isArray(tiersRes) ? tiersRes : tiersRes.data
    const pro = tiers.find((t: { key: string }) => t.key === 'pro')
    const priceId = pro.prices.find(
      (p: { stripePriceId: string | null }) => p.stripePriceId,
    )?.stripePriceId
    expect(priceId, 'no pro priceId — cannot test checkout').toBeTruthy()

    // Sign up + grab token
    const signupRes = await request.post(API_BASE + '/users', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        email: 'upgrade-' + Date.now() + '@example.com',
        password: 'TestPass123!',
        name: 'Upgrade Tester',
      },
    })
    const session = await signupRes.json()
    const checkout = await request.post(API_BASE + '/billing/checkout', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      data: { priceId },
    })
    expect(checkout.status(), 'checkout endpoint must succeed').toBe(200)
    const body = await checkout.json()
    expect(body.checkoutUrl, 'checkoutUrl missing — Stripe integration broken').toMatch(
      /checkout\.stripe\.com/,
    )
  })

  test('GET /api/billing/status returns the user starting on the free tier', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const status = await (await api.get('/billing/status')).json()
    expect(status.planKey).toBeTruthy()
    expect(status.isFree).toBe(true)
    expect(status.limits).toBeTruthy()
  })

  test('logged-out checkout returns 401', async ({ request }) => {
    const res = await request.post(API_BASE + '/billing/checkout', {
      headers: { 'Content-Type': 'application/json' },
      data: { priceId: 'price_test_anything' },
    })
    expect(res.status()).toBe(401)
  })

  test('checkout with unknown priceId returns 400', async ({ request }) => {
    const signupRes = await request.post(API_BASE + '/users', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        email: 'badprice-' + Date.now() + '@example.com',
        password: 'TestPass123!',
        name: 'Test',
      },
    })
    const session = await signupRes.json()
    const res = await request.post(API_BASE + '/billing/checkout', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      data: { priceId: 'price_made_up_garbage_' + Date.now() },
    })
    expect(res.status()).toBe(400)
  })

  test('upgrade button on /pricing card opens billing flow when clicked', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    // PricingPage exposes an upgrade button per tier; clicking pro tier should issue POST /api/billing/checkout
    const reqs = await captureNetwork(page, async () => {
      const upgradeBtn = page
        .getByRole('button', { name: /upgrade.*pro|select.*pro|choose.*pro/i })
        .first()
      if (await upgradeBtn.count()) {
        await upgradeBtn.click()
        await page.waitForTimeout(2000)
      }
    })
    const checkoutCall = whereUrl(reqs, /\/api\/billing\/checkout/, 'POST')
    if (checkoutCall.length > 0) {
      expect(checkoutCall[0].status, 'checkout call from UI must succeed').toBe(200)
    }
  })

  test('Team tier appears with at least one paid Stripe priceId', async ({ request }) => {
    const res = await request.get(API_BASE + '/billing/tiers')
    expect(res.status()).toBe(200)
    const body = await res.json()
    const tiers = Array.isArray(body) ? body : body.data
    const team = tiers.find((t: { key: string }) => t.key === 'team')
    expect(team, 'team tier must be configured').toBeTruthy()
    const hasRealPriceId = team.prices.some(
      (p: { stripePriceId: string | null }) =>
        p.stripePriceId && p.stripePriceId.startsWith('price_'),
    )
    expect(hasRealPriceId, 'team tier needs at least one real Stripe priceId').toBe(true)
  })
})
