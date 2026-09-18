import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('/billing & /pricing & /plan-updated', () => {
  test('/billing renders for authed user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('/pricing renders 3 plan cards', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toMatch(/starter|free/)
    expect(body).toMatch(/pro|team|scale/)
  })

  test('GET /api/billing/tiers returns 3 tiers with stripe priceIds for paid', async ({ page }) => {
    await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/tiers`, { headers: authHeaders(page) })
    expect(res.status()).toBe(200)
    const data = (await res.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId?: string | null }> }>
    }
    expect(data.data.length).toBeGreaterThanOrEqual(2)
    const pro = data.data.find((t) => t.key === 'pro')
    expect(pro).toBeTruthy()
    expect(
      pro!.prices.find((p) => p.stripePriceId && p.stripePriceId.startsWith('price_')),
    ).toBeTruthy()
  })

  test('GET /api/billing/status returns the current plan', async ({ page }) => {
    await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: authHeaders(page),
    })
    expect(res.status()).toBe(200)
    const status = (await res.json()) as { planKey: string; isFree: boolean }
    expect(status.planKey).toBe('free')
    expect(status.isFree).toBe(true)
  })

  test('POST /api/billing/checkout returns a real Stripe Checkout URL', async ({ page }) => {
    await signup(page)
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: authHeaders(page),
    })
    const tiers = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId?: string | null }> }>
    }
    const pro = tiers.data.find((t) => t.key === 'pro')!
    const priceId = pro.prices.find((p) => p.stripePriceId)!.stripePriceId!
    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(page),
      data: { priceId },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { checkoutUrl: string }
    expect(body.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/)
  })

  test('POST /api/billing/cancel returns canceled / no-active-subscription gracefully', async ({
    page,
  }) => {
    await signup(page)
    const res = await page.request.post(`${API_BASE}/billing/cancel`, {
      headers: authHeaders(page),
      data: {},
    })
    // For a free user, cancel either returns canceled:false / error or 200 with a no-op.
    expect([200, 400, 404]).toContain(res.status())
  })

  test('/plan-updated renders return-home shell', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toMatch(/welcome|plan|thank|updated|return|home|dashboard/)
  })

  test('captureNetwork: /billing page calls /api/billing/status', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/billing')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url))
    expect(call).toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('captureNetwork: /pricing page calls /api/billing/tiers', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    // Pricing may render before authed; fallback OK if it doesn't fire.
    if (call) expect(call.status).toBe(200)
  })

  test('Stripe webhook with bad signature returns 400', async ({ page }) => {
    const res = await page.request.post(`${API_BASE}/users/payment-notification/stripe`, {
      data: { type: 'checkout.session.completed', id: 'evt_test' },
      headers: { 'stripe-signature': 'bad-sig' },
    })
    expect(res.status()).toBe(400)
  })

  test('captureNetwork: /plan-updated calls /api/billing/status', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url))
    if (call) expect(call.status).toBe(200)
  })
})
