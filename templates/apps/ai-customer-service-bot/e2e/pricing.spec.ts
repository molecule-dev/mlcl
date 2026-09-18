import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/pricing', () => {
  test('pricing page fires GET /api/billing/tiers and renders the tier names', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    })
    const tiers = reqs.find(
      (r) => /\/api\/billing\/tiers(?:\?|$)/.test(r.url) && r.method === 'GET',
    )
    expect(tiers, 'GET /api/billing/tiers should fire on pricing load').toBeTruthy()
    expect(tiers!.status).toBeLessThan(300)
    await expect(page.getByText(/free/i).first()).toBeVisible()
    await expect(page.getByText(/pro/i).first()).toBeVisible()
  })

  test('renders the pricing-page container', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-page"]')).toBeVisible({ timeout: 15_000 })
  })

  test('renders the Free tier card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-tier-free"]')).toBeVisible({ timeout: 15_000 })
  })

  test('renders the Pro tier card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-tier-pro"]')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('renders the Team tier card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('[data-mol-id="pricing-tier-team"]')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('checkout (Pro priceId) hits /api/billing/checkout and returns a real Stripe URL', async ({
    page,
  }) => {
    await signup(page)
    // Get the Pro priceId from the public tiers endpoint, then call checkout
    // directly via the same authenticated context. This proves the full
    // backend → Stripe wiring works end-to-end without bouncing through a
    // cross-origin navigation that breaks Playwright's response capture.
    const tiersRes = await page.request.get(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/billing/tiers',
    )
    const tiersBody = await tiersRes.json()
    const proTier = tiersBody.data.find((t: { key: string }) => t.key === 'pro')
    const priceId = proTier?.prices?.find(
      (p: { period: string }) => p.period === 'month',
    )?.stripePriceId
    expect(priceId, 'Pro tier must have a STRIPE_*_PRO_MONTHLY priceId configured').toBeTruthy()
    const cookies = await page.context().cookies()
    const checkoutRes = await page.request.post(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/billing/checkout',
      {
        headers: {
          Cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
          'Content-Type': 'application/json',
        },
        data: { priceId },
      },
    )
    expect(checkoutRes.status()).toBeLessThan(300)
    const body = await checkoutRes.json()
    expect(body.checkoutUrl, 'response should include a Stripe Checkout URL').toMatch(
      /^https?:\/\/[^/]*stripe\.com\//,
    )
  })

  test('checkout (Team priceId) hits /api/billing/checkout and returns a real Stripe URL', async ({
    page,
  }) => {
    await signup(page)
    const tiersRes = await page.request.get(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/billing/tiers',
    )
    const tiersBody = await tiersRes.json()
    const teamTier = tiersBody.data.find((t: { key: string }) => t.key === 'team')
    const priceId = teamTier?.prices?.find(
      (p: { period: string }) => p.period === 'month',
    )?.stripePriceId
    expect(priceId, 'Team tier must have a STRIPE_*_TEAM_MONTHLY priceId configured').toBeTruthy()
    const cookies = await page.context().cookies()
    const checkoutRes = await page.request.post(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/billing/checkout',
      {
        headers: {
          Cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
          'Content-Type': 'application/json',
        },
        data: { priceId },
      },
    )
    expect(checkoutRes.status()).toBeLessThan(300)
    const body = await checkoutRes.json()
    expect(body.checkoutUrl, 'response should include a Stripe Checkout URL').toMatch(
      /^https?:\/\/[^/]*stripe\.com\//,
    )
  })
})
