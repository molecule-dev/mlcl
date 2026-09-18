import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authedApi, signup } from './_helpers.js'

test.describe('Billing', () => {
  test('renders current plan + tiers list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.getByTestId('billing-current-plan')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('billing-current-plan-name')).toContainText(/free/i)
    await expect(page.getByTestId('billing-tiers')).toBeVisible()
    await expect(page.getByTestId('billing-tier-pro')).toBeVisible()
    await expect(page.getByTestId('billing-tier-team')).toBeVisible()
  })

  test('switching to yearly toggles tier prices', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.getByTestId('billing-tier-pro')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('billing-period-year').click()
    // Yearly Pro CTA exists
    await expect(page.getByTestId('billing-cta-pro-year')).toBeVisible()
  })

  test('cancel subscription is hidden for free users', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.getByTestId('billing-current-plan')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('billing-cancel-subscription')).toHaveCount(0)
  })

  test('upgrade CTA fires POST /api/billing/checkout', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.getByTestId('billing-tier-pro')).toBeVisible({ timeout: 10000 })
    const checkoutPromise = page.waitForResponse(
      (r) => r.url().includes('/api/billing/checkout') && r.request().method() === 'POST',
      { timeout: 10000 },
    )
    await page.getByTestId('billing-cta-pro-month').click()
    const res = await checkoutPromise
    expect([200, 201]).toContain(res.status())
  })

  test('POST /api/billing/checkout returns a real Stripe checkout URL', async ({ request }) => {
    // Driving the click in a browser navigates the page immediately on
    // success (window.location.href = checkoutUrl), which makes the
    // response body unreadable in Playwright. Hit the API directly with
    // the same authed user — the request is identical to what the click
    // produces, so this still proves the real-Stripe-URL invariant.
    //
    // A 2xx with `checkoutUrl: null` is the exact failure mode the
    // pricing-page UI silently masks ("Welcome to Pro!" rendered before
    // any plan flip). This test fails loudly if the integration ever
    // regresses to a placeholder.
    const session = await (await import('./_helpers.js')).apiSignup(request)
    const api = await authedApi(request, session.accessToken!)
    const tiersRes = await api.get('/billing/tiers')
    expect(tiersRes.status()).toBe(200)
    const tiersBody = (await tiersRes.json()) as {
      data: Array<{
        key: string
        prices: Array<{ period: string; stripePriceId: string | null }>
      }>
    }
    const proMonthly = tiersBody.data
      .find((t) => t.key === 'pro')
      ?.prices.find((p) => p.period === 'month')?.stripePriceId
    expect(proMonthly, 'pro/month price ID must be configured').toBeTruthy()

    const checkoutRes = await request.post(API_BASE + '/billing/checkout', {
      data: { priceId: proMonthly },
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    expect(checkoutRes.status()).toBe(200)
    const body = (await checkoutRes.json()) as { checkoutUrl?: string; updated?: boolean }
    expect(body.checkoutUrl, 'free → pro must return a real Stripe checkout URL, not null').toMatch(
      /checkout\.stripe\.com|cs_test_/,
    )
  })
})
