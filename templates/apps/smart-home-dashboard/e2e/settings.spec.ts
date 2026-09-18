import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiSignup,
  authedApi,
  captureNetwork,
  signup,
  whereUrl,
} from './_helpers.js'

test.describe('Settings & Billing', () => {
  test('settings page shows the Free plan and an upgrade link', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(whereUrl(reqs, /\/api\/billing\/status(?:\?|$)/, 'GET').length).toBeGreaterThan(0)
    const planName = page.getByTestId('settings-plan-name').first()
    await expect(planName).toBeVisible()
    await expect(planName).toContainText(/free|…/i)
    await expect(page.getByTestId('settings-upgrade-link').first()).toBeVisible()
  })

  test('clicking "See plans" routes to the public pricing page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-upgrade-link').first().click()
    await expect(page).toHaveURL(/\/pricing/)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('public /pricing page renders without auth and lists tier names', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading').first()).toBeVisible()
    // Free tier name should appear (case-insensitive)
    const text = await page.locator('body').textContent()
    expect(text).toMatch(/free|pro|team/i)
  })

  test('billing endpoints respond with the published tiers', async ({ request }) => {
    const tiersRes = await request.get(API_BASE + '/billing/tiers')
    expect(tiersRes.status()).toBe(200)
    const tiers = await tiersRes.json()
    const arr = Array.isArray(tiers) ? tiers : tiers.data || tiers.tiers || []
    expect(arr.length).toBeGreaterThan(0)
    // Sanity: every tier should expose a key + name + prices array (non-empty)
    for (const tier of arr) {
      expect(typeof tier.key).toBe('string')
      expect(typeof tier.name).toBe('string')
      expect(Array.isArray(tier.prices)).toBe(true)
    }
    // We must publish at least free + pro
    const keys = arr.map((t: { key: string }) => t.key)
    expect(keys).toEqual(expect.arrayContaining(['free', 'pro']))
  })

  test('signed-in user GET /api/billing/status returns the planKey + isFree', async ({
    request,
  }) => {
    const u = await apiSignup(request)
    const api = await authedApi(request, u.accessToken!)
    const res = await api.get('/billing/status')
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    const o = (body.data as Record<string, unknown>) ?? body
    expect(typeof o.planKey).toBe('string')
    expect(o.planKey).toBe('free')
    expect(o.isFree).toBe(true)
    expect(typeof o.name).toBe('string')
  })

  test('POST /api/billing/checkout returns a real Stripe Checkout URL for the pro priceId', async ({
    request,
  }) => {
    const u = await apiSignup(request)
    const api = await authedApi(request, u.accessToken!)
    const tiersRes = await api.get('/billing/tiers')
    const tiersBody = await tiersRes.json()
    const tiers = (tiersBody.data ?? tiersBody.tiers ?? tiersBody) as Array<{
      key: string
      prices: Array<{ period: string; stripePriceId: string | null }>
    }>
    const pro = tiers.find((t) => t.key === 'pro')
    const priceId = pro?.prices.find((p) => p.period === 'month')?.stripePriceId
    expect(priceId, 'pro monthly stripePriceId is wired').toBeTruthy()
    const checkoutRes = await api.post('/billing/checkout', { priceId })
    expect(checkoutRes.status()).toBeLessThan(300)
    const checkout = (await checkoutRes.json()) as {
      checkoutUrl?: string
      data?: { checkoutUrl?: string }
    }
    const url = checkout.checkoutUrl ?? checkout.data?.checkoutUrl
    expect(url, 'real Stripe Checkout session URL').toMatch(/checkout\.stripe\.com|cs_test_/)
  })

  test('clicking the Pro upgrade CTA on /pricing posts to /api/billing/checkout', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle').catch(() => {})
    const proCta = page.locator('[data-mol-id="pricing-cta-pro"]').first()
    await expect(proCta, 'pro upgrade CTA visible').toBeVisible({ timeout: 10_000 })
    const reqs = await captureNetwork(page, async () => {
      await proCta.click()
      // We don't follow the redirect (Stripe Checkout) — just wait long enough
      // for the POST /api/billing/checkout to land.
      await page.waitForTimeout(3000)
    })
    const posts = whereUrl(reqs, /\/api\/billing\/checkout/, 'POST')
    expect(posts.length, 'POST /api/billing/checkout fired').toBeGreaterThan(0)
    expect(posts[0]!.status, 'checkout request was accepted').toBeLessThan(300)
  })
})
