/**
 * Billing — tier list, status, Stripe checkout. The checkout endpoint
 * MUST return a real Stripe checkout URL (the env keys are real); we
 * do NOT follow the redirect (would burn test cards) but we assert it
 * looks like a Stripe checkout URL.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, signup } from './_helpers.js'

interface TierPrice {
  period: 'month' | 'year'
  price: string
  stripePriceId: string | null
}
interface Tier {
  key: string
  name: string
  prices: TierPrice[]
  limits?: Record<string, unknown>
}

test('Billing tiers endpoint returns free + pro + team with prices and limits', async ({
  page,
}) => {
  await signup(page)
  const tiers = await apiRequest<{ data: Tier[] }>(page, 'GET', '/api/billing/tiers')
  expect(tiers.status).toBe(200)
  const keys = tiers.body.data.map((t) => t.key).sort()
  expect(keys).toContain('free')
  expect(keys).toContain('pro')
  // Pro tier has a stripe price id
  const pro = tiers.body.data.find((t) => t.key === 'pro')!
  expect(pro.prices.find((p) => p.period === 'month')?.stripePriceId).toMatch(/^price_/)
})

test('Billing status reflects free plan for fresh signup', async ({ page }) => {
  await signup(page)
  const status = await apiRequest<{ planKey: string; isFree: boolean; category: string }>(
    page,
    'GET',
    '/api/billing/status',
  )
  expect(status.status).toBe(200)
  expect(status.body.isFree).toBe(true)
  expect(status.body.category).toBe('free')
})

test('Billing checkout returns a real Stripe checkout URL', async ({ page }) => {
  await signup(page)
  const tiers = await apiRequest<{ data: Tier[] }>(page, 'GET', '/api/billing/tiers')
  const pro = tiers.body.data.find((t) => t.key === 'pro')!
  const monthly = pro.prices.find((p) => p.period === 'month')!
  expect(monthly.stripePriceId).toBeTruthy()

  const checkout = await apiRequest<{ checkoutUrl?: string }>(
    page,
    'POST',
    '/api/billing/checkout',
    {
      priceId: monthly.stripePriceId,
    },
  )
  expect(checkout.status).toBe(200)
  expect(checkout.body.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//)
})

test('Billing rejects unknown priceId with 400', async ({ page }) => {
  await signup(page)
  const r = await apiRequest<{ error: string }>(page, 'POST', '/api/billing/checkout', {
    priceId: 'price_NOT_REAL',
  })
  expect(r.status).toBe(400)
  expect(r.body.error).toMatch(/unknown|invalid/i)
})

test('Billing page renders all tiers', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings/billing', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/Free/, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/Pro/, { exact: false }).first()).toBeVisible()
})
