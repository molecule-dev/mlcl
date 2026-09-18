import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, apiRaw, signup } from './_helpers.js'

test('GET /api/billing/tiers exposes 3 plans with real Stripe priceIds for paid plans', async ({
  page,
}) => {
  await signup(page)
  const tiers = await api<{
    data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
  }>(page, 'GET', '/billing/tiers')
  const keys = tiers.data.map((t) => t.key).sort()
  expect(keys).toEqual(['free', 'pro', 'team'])

  const pro = tiers.data.find((t) => t.key === 'pro')!
  const proHasPriceId = pro.prices.some(
    (p) => typeof p.stripePriceId === 'string' && p.stripePriceId.startsWith('price_'),
  )
  expect(proHasPriceId, 'pro tier carries a real Stripe priceId').toBe(true)

  const team = tiers.data.find((t) => t.key === 'team')!
  const teamHasPriceId = team.prices.some(
    (p) => typeof p.stripePriceId === 'string' && p.stripePriceId.startsWith('price_'),
  )
  expect(teamHasPriceId, 'team tier carries a real Stripe priceId').toBe(true)
})

test('GET /api/billing/status returns the user’s default plan', async ({ page }) => {
  await signup(page)
  const status = await api<{ planKey: string; isFree: boolean; limits?: Record<string, unknown> }>(
    page,
    'GET',
    '/billing/status',
  )
  expect(status.planKey).toBe('free')
  expect(status.isFree).toBe(true)
})

test('POST /api/billing/checkout returns a real Stripe Checkout URL for a paid priceId', async ({
  page,
}) => {
  await signup(page)
  const tiers = await api<{
    data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
  }>(page, 'GET', '/billing/tiers')
  const proPriceId = tiers.data
    .find((t) => t.key === 'pro')!
    .prices.find((p) => typeof p.stripePriceId === 'string')!.stripePriceId!

  const created = await api<{ checkoutUrl?: string; url?: string }>(
    page,
    'POST',
    '/billing/checkout',
    { priceId: proPriceId },
  )
  const url = created.checkoutUrl ?? created.url
  expect(url, '/billing/checkout returns a Stripe URL').toMatch(
    /checkout\.stripe\.com|cs_(test|live)_/,
  )
})

test('POST /api/billing/checkout rejects an unknown priceId with 4xx', async ({ page }) => {
  await signup(page)
  const resp = await apiRaw(page, 'POST', '/billing/checkout', { priceId: 'price_NOT_REAL' })
  expect(resp.status()).toBeGreaterThanOrEqual(400)
})

test('Pricing page renders 3 tiers (free, pro, team)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/pro/i).first()).toBeVisible()
  await expect(page.getByText(/team/i).first()).toBeVisible()
})
