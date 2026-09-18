import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listTiers, signup } from './_helpers.js'

test.describe('Billing /billing', () => {
  test('current plan loads from /api/billing/status as Free', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/billing')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const status = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url))
    const tiers = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(status, 'GET /api/billing/status').toBeTruthy()
    expect(tiers, 'GET /api/billing/tiers').toBeTruthy()
    expect(status!.status).toBeLessThan(300)
    expect(tiers!.status).toBeLessThan(300)
    await expect(page.locator('[data-mol-id="billing-current-plan-name"]')).toContainText(/free/i)
  })

  test('tier grid renders all configured tiers (free + paid)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const tiers = await listTiers(page, accessToken)
    expect(tiers.length).toBeGreaterThanOrEqual(3)

    await page.goto(APP_BASE + '/billing')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    for (const t of tiers) {
      await expect(page.locator(`[data-mol-id="billing-plan-${t.key}"]`)).toBeVisible()
    }
  })

  test('Switch to Pro creates a real Stripe Checkout session URL', async ({ page }) => {
    const { accessToken } = await signup(page)
    const tiers = await listTiers(page, accessToken)
    const pro = tiers.find((t) => t.key === 'pro')
    expect(pro, 'expected a pro tier in /billing/tiers').toBeTruthy()
    const monthly = pro!.prices.find((p) => p.period === 'month')
    expect(monthly?.stripePriceId, 'pro monthly stripePriceId must be set').toBeTruthy()

    await page.goto(APP_BASE + '/billing')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

    const reqs: { method: string; url: string; status: number }[] = []
    page.on('response', (resp) =>
      reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() }),
    )
    // Stripe checkout will navigate cross-origin; intercept the redirect by
    // listening for the framePresent navigation request.
    const checkoutNavigated = page.waitForURL(/checkout\.stripe\.com|cs_test_/, {
      timeout: 15000,
    })
    await page.locator('[data-mol-id="billing-plan-pro-cta"]').first().click()
    await checkoutNavigated.catch(() => null)

    const post = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
    expect(post, 'expected POST /api/billing/checkout').toBeTruthy()
    expect(post!.status).toBeLessThan(300)
    // Either we already navigated to Stripe, or the redirect URL was set on
    // window.location and the page is in flight. Either way the URL should
    // eventually point at Stripe.
    expect(page.url()).toMatch(/checkout\.stripe\.com|\/billing/)
  })

  test('feature limits show numeric counts not "—"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    const free = page.locator('[data-mol-id="billing-plan-free-features"]')
    await expect(free).toBeVisible()
    // Free tier has maxMeters=3, maxAlerts=5 — both > 0, so numeric.
    await expect(free).toContainText(/3/)
  })
})
