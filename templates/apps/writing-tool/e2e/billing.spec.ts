/**
 * /billing — current entitlements + Stripe checkout.
 *
 * Asserts: /billing/status returns the live free plan, the tier ladder
 * renders three cards (free / pro / team), selecting Pro POSTs
 * /api/billing/checkout and gets a real `cs_test_*` Stripe Checkout
 * URL back.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, captureNetwork, signup } from './_helpers.js'

interface BillingStatus {
  planKey: string
  category: string
  isFree: boolean
}

interface BillingTiersResp {
  data: Array<{
    key: string
    prices: Array<{ period: 'month' | 'year'; stripePriceId: string | null }>
  }>
}

test.describe('/billing', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
  })

  test('renders current plan + 3 tier cards', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(page.getByTestId('billing-current')).toBeVisible()
    await expect(page.getByTestId('billing-tier-free')).toBeVisible()
    await expect(page.getByTestId('billing-tier-pro')).toBeVisible()
    await expect(page.getByTestId('billing-tier-team')).toBeVisible()
  })

  test('billing status API returns isFree=true for a fresh signup', async ({ page }) => {
    const status = await authedGet<BillingStatus>(page, '/billing/status')
    expect(status.isFree).toBe(true)
    expect(status.category).toBe('free')
  })

  test('billing tiers API returns Stripe priceIds for paid plans', async ({ page }) => {
    const resp = await authedGet<BillingTiersResp>(page, '/billing/tiers')
    const pro = resp.data.find((t) => t.key === 'pro')
    expect(pro, 'pro tier must exist').toBeTruthy()
    const price = pro?.prices.find((p) => p.period === 'month')
    expect(price?.stripePriceId, 'monthly Pro price must have a Stripe id').toBeTruthy()
    expect(price?.stripePriceId).toMatch(/^price_/)
  })

  test('selecting Pro opens a real Stripe checkout URL', async ({ page }) => {
    // Block the actual navigation to checkout.stripe.com so the test
    // doesn't try to load a Stripe page in the headless browser; we just
    // need to assert the redirect target.
    let redirectedTo: string | null = null
    await page.route('https://checkout.stripe.com/**', (route) => {
      redirectedTo = route.request().url()
      return route.fulfill({ status: 200, body: 'stub' })
    })
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('billing-select-pro').click()
      await page.waitForTimeout(2_500)
    })
    const post = reqs.find(
      (r) => /\/api\/billing\/checkout(\?|$)/.test(r.url) && r.method === 'POST',
    )
    expect(post?.status, 'POST /api/billing/checkout must succeed').toBeGreaterThanOrEqual(200)
    expect(post?.status).toBeLessThan(300)
    expect(redirectedTo, 'should have redirected to Stripe Checkout').toMatch(
      /checkout\.stripe\.com\/c\/pay\/cs_test_/,
    )
  })

  test('billing-cycle toggle switches between month and year', async ({ page }) => {
    await page.getByTestId('billing-cycle-year').click()
    await expect(page.getByTestId('billing-tier-pro')).toBeVisible()
    await page.getByTestId('billing-cycle-month').click()
    await expect(page.getByTestId('billing-tier-pro')).toBeVisible()
  })
})
