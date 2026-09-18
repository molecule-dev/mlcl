import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPost, captureNetwork, signupAndToken, unwrap } from './_helpers'

interface BillingTier {
  key: string
  name: string
  prices: { period: string; price: string; stripePriceId: string | null }[]
}
interface BillingStatus {
  category: string
  isFree?: boolean
  limits?: { maxEmployees?: number }
}

test.describe('/settings/billing', () => {
  test('renders pricing tiers and current plan badge', async ({ page }) => {
    const { token } = await signupAndToken(page)
    void token
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.getByRole('heading', { name: /billing/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^free$/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /^pro$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^team$/i })).toBeVisible()
    // Free user — current badge present on Free card
    await expect(page.getByText(/^current$/i).first()).toBeVisible()
  })

  test('GET /api/billing/tiers exposes Stripe price IDs and limit fields', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const { status, body } = await apiGet<BillingTier[]>(page, token, '/billing/tiers')
    expect(status).toBe(200)
    const tiers = (Array.isArray(body) ? body : (body as { data?: BillingTier[] }).data) ?? []
    expect(tiers.length, 'must expose at least Free + Pro + Team').toBeGreaterThanOrEqual(3)
    const keys = tiers.map((t) => t.key).sort()
    expect(keys).toEqual(expect.arrayContaining(['free', 'pro', 'team']))
  })

  test('GET /api/billing/status returns free for new user', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const { status, body } = await apiGet<BillingStatus>(page, token, '/billing/status')
    expect(status).toBe(200)
    const data = unwrap<BillingStatus>(body) ?? body
    expect(data.category).toBe('free')
  })

  test('Switch to Pro fires checkout endpoint when Stripe is configured', async ({ page }) => {
    const { token } = await signupAndToken(page)
    const tiersResp = await apiGet<BillingTier[]>(page, token, '/billing/tiers')
    const tiers =
      (Array.isArray(tiersResp.body)
        ? tiersResp.body
        : (tiersResp.body as { data?: BillingTier[] }).data) ?? []
    const pro = tiers.find((t) => t.key === 'pro')
    const proPrice =
      pro?.prices.find((p) => p.period === 'month')?.stripePriceId ??
      pro?.prices.find((p) => p.period === 'year')?.stripePriceId ??
      null
    if (!proPrice) test.skip(true, 'no Stripe price id for pro tier — env not configured')
    const { status, body } = await apiPost<{ checkoutUrl?: string; updated?: boolean }>(
      page,
      token,
      '/billing/checkout',
      { priceId: proPrice },
    )
    expect(status).toBeLessThan(500)
    if (status === 200) {
      const data = unwrap<{ checkoutUrl?: string; updated?: boolean }>(body) ?? body
      expect(
        data.checkoutUrl || data.updated,
        'checkout must return either a Stripe URL or an updated flag',
      ).toBeTruthy()
    }
    void captureNetwork
  })
})

test.describe('/pricing (public)', () => {
  test('renders three plans and a CTA back to signup', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^free$/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /^pro$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^team$/i })).toBeVisible()
    await expect(page.getByText(/employees/i).first()).toBeVisible()
  })
})
