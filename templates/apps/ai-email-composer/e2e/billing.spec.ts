import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, apiPost, signup } from './_helpers.js'

interface TierRow {
  key: string
  name: string
  prices: Array<{ period: string; price: string; stripePriceId: string | null }>
  limits: Record<string, number | boolean>
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: Record<string, number | boolean>
}

test('GET /billing/tiers exposes the configured Pro and Team plans', async ({ page }) => {
  await signup(page)
  const r = await apiGet<{ data: TierRow[] }>(page, '/billing/tiers')
  expect(r.status).toBe(200)
  const tiers = r.body?.data ?? []
  expect(tiers.find((t) => t.key === 'free')).toBeTruthy()
  expect(tiers.find((t) => t.key === 'pro')).toBeTruthy()
  expect(tiers.find((t) => t.key === 'team')).toBeTruthy()
  // Pro and team must each expose a stripePriceId for at least one billing period
  const pro = tiers.find((t) => t.key === 'pro')!
  expect(
    pro.prices.some(
      (p) => typeof p.stripePriceId === 'string' && p.stripePriceId.startsWith('price_'),
    ),
  ).toBe(true)
  const team = tiers.find((t) => t.key === 'team')!
  expect(
    team.prices.some(
      (p) => typeof p.stripePriceId === 'string' && p.stripePriceId.startsWith('price_'),
    ),
  ).toBe(true)
})

test('GET /billing/status returns a free tier for a fresh user', async ({ page }) => {
  await signup(page)
  const r = await apiGet<BillingStatus>(page, '/billing/status')
  expect(r.status).toBe(200)
  expect(r.body?.planKey).toBe('free')
  expect(r.body?.isFree).toBe(true)
  expect(r.body?.limits?.maxDrafts).toBeGreaterThan(0)
})

test('POST /billing/checkout returns a real Stripe Checkout URL for a Pro upgrade', async ({
  page,
}) => {
  await signup(page)
  const tiers = await apiGet<{ data: TierRow[] }>(page, '/billing/tiers')
  const pro = tiers.body?.data.find((t) => t.key === 'pro')!
  const monthly = pro.prices.find((p) => p.period === 'month' && p.stripePriceId)!
  expect(monthly?.stripePriceId).toBeTruthy()

  const r = await apiPost<{ checkoutUrl?: string; updated?: boolean }>(page, '/billing/checkout', {
    priceId: monthly.stripePriceId,
  })
  expect(r.status, JSON.stringify(r.body)).toBe(200)
  // Either we got a real Stripe Checkout URL OR the subscription was updated in-place.
  const checkoutUrl = r.body?.checkoutUrl
  if (checkoutUrl) {
    expect(checkoutUrl).toMatch(/checkout\.stripe\.com|^https:\/\/.*stripe/)
  } else {
    expect(r.body?.updated).toBe(true)
  }
})

test('POST /billing/checkout rejects unknown price IDs', async ({ page }) => {
  await signup(page)
  const r = await apiPost(page, '/billing/checkout', { priceId: 'price_FAKE_NOT_REAL' })
  expect(r.status).toBe(400)
})

test('Billing page UI shows current plan and tier grid', async ({ page }) => {
  await signup(page)
  await page.goto('/billing')
  // Current plan card
  await expect(page.locator('[data-mol-id="billing-current-plan-name"]')).toBeVisible({
    timeout: 15_000,
  })
  // Plan grid
  await expect(page.locator('[data-mol-id="billing-plan-free"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="billing-plan-pro"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="billing-plan-team"]')).toBeVisible()
})
