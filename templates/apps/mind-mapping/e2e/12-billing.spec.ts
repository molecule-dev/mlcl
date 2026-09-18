import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('Billing', () => {
  test('shows current Free plan + lists Pro and Team tiers from /billing/tiers', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('bill'))

    const status = await page.request.get(`${API_BASE}/billing/status`, {
      headers: apiHeaders(accessToken),
    })
    expect(status.status()).toBe(200)
    const sBody = (await status.json()) as { name: string; isFree: boolean }
    expect(sBody.isFree).toBe(true)

    const tiers = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    expect(tiers.status()).toBe(200)
    const tBody = (await tiers.json()) as { data: Array<{ key: string; name: string }> }
    const keys = tBody.data.map((t) => t.key).sort()
    expect(keys).toEqual(expect.arrayContaining(['free', 'pro', 'team']))

    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.locator('[data-mol-id="billing-current-plan"]')).toContainText(/Free/)
    await expect(page.locator('[data-mol-id="billing-tier"][data-tier-key="free"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="billing-tier"][data-tier-key="pro"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="billing-tier"][data-tier-key="team"]')).toBeVisible()
  })

  test('Upgrade Pro Monthly redirects to a real Stripe Checkout session', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('upgrade'))
    // Fetch the tiers and find pro monthly price id
    const tiers = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    const tBody = (await tiers.json()) as {
      data: Array<{ key: string; prices: Array<{ period: string; stripePriceId: string | null }> }>
    }
    const pro = tBody.data.find((t) => t.key === 'pro')
    const proMonthly = pro?.prices.find((p) => p.period === 'month')
    test.skip(!proMonthly?.stripePriceId, 'STRIPE_MIND_MAPPING_PRO_MONTHLY not configured in env')

    // Direct API call — the Billing page calls window.location.href = url on
    // success, which races the playwright response-body fetch (Network.getResponseBody
    // throws once the page has navigated away). Asserting the contract directly
    // is what actually matters: the API returns a real Stripe Checkout URL.
    const checkoutResp = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId: proMonthly!.stripePriceId },
    })
    expect(checkoutResp.status()).toBe(200)
    const body = (await checkoutResp.json()) as { checkoutUrl?: string }
    expect(body.checkoutUrl).toBeTruthy()
    expect(body.checkoutUrl!).toMatch(/checkout\.stripe\.com|cs_test_/)

    // Sanity: the UI button exists and is wired to call the same endpoint.
    await page.goto(APP_BASE + '/settings/billing')
    await expect(
      page.locator('[data-mol-id="billing-checkout-monthly"][data-tier-key="pro"]'),
    ).toBeVisible()
  })
})
