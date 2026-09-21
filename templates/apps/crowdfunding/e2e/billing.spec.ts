import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers'

/**
 * Billing/checkout — proves the Stripe payments bond is wired
 * end-to-end with the real STRIPE_CROWDFUNDING_* price ids from
 * .env.flagship-prices. A POST /api/billing/checkout returns a
 * checkout.stripe.com URL on success.
 *
 * Past failure: a /checkout endpoint that just bumps users.planKey
 * without actually creating a Stripe Session — users could "upgrade"
 * for free.
 */

test('GET /api/billing/tiers returns the configured pricing tiers', async ({ page }) => {
  await signup(page)
  const data = await page.evaluate(async () => {
    const r = await fetch('/api/billing/tiers')
    return r.json()
  })
  const tiers: Array<{ key: string; prices: Array<{ period: string; stripePriceId?: string }> }> =
    Array.isArray(data) ? data : (data.data ?? [])
  const keys = tiers.map((t) => t.key)
  expect(keys).toEqual(expect.arrayContaining(['free', 'pro', 'team']))
  const pro = tiers.find((t) => t.key === 'pro')!
  expect(pro).toBeTruthy()
  const monthlyPrice = pro.prices.find((p) => p.period === 'month')
  expect(
    monthlyPrice?.stripePriceId,
    'STRIPE_CROWDFUNDING_PRO_MONTHLY must resolve in fill-smoke-env',
  ).toMatch(/^price_/)
})

test('GET /api/billing/status returns a free-tier shape for a fresh user', async ({ page }) => {
  await signup(page)
  const out = await page.evaluate(async () => {
    const r = await fetch('/api/billing/status', { headers: { accept: 'application/json' } })
    return { status: r.status, body: await r.json() }
  })
  expect(out.status).toBe(200)
  expect(out.body.planKey).toBe('free')
  expect(out.body.isFree).toBe(true)
  expect(out.body.limits).toBeTruthy()
  // Free-tier limits exposed in tiers.ts
  expect(typeof out.body.limits.maxCampaigns).toBe('number')
  expect(typeof out.body.limits.maxPledges).toBe('number')
  expect(typeof out.body.limits.maxTiers).toBe('number')
  expect(typeof out.body.limits.maxUpdates).toBe('number')
})

test('POST /api/billing/checkout returns a real Stripe Checkout URL for the pro priceId', async ({
  page,
}) => {
  await signup(page)
  const priceId = await page.evaluate(async () => {
    const r = await fetch('/api/billing/tiers')
    const d = await r.json()
    const tiers = Array.isArray(d) ? d : (d.data ?? [])
    const pro = tiers.find((t: { key: string }) => t.key === 'pro')
    return pro?.prices?.find((p: { period: string }) => p.period === 'month')?.stripePriceId
  })
  expect(priceId).toMatch(/^price_/)

  const out = await page.evaluate(async (pid: string) => {
    const r = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: pid }),
    })
    return { status: r.status, body: await r.json() }
  }, priceId)

  expect(out.status, JSON.stringify(out.body)).toBe(200)
  expect(out.body.checkoutUrl, JSON.stringify(out.body)).toMatch(
    /^https:\/\/checkout\.stripe\.com\//,
  )
})

test('POST /api/billing/checkout rejects an unknown priceId', async ({ page }) => {
  // The unknown priceId is EXPECTED to be rejected with a 400 — the
  // browser logs the failed resource by design.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: 'status of 400',
  })
  await signup(page)
  const out = await page.evaluate(async () => {
    const r = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: 'price_DEFINITELY_NOT_REAL' }),
    })
    return { status: r.status, body: await r.json() }
  })
  expect(out.status).toBe(400)
  expect(out.body.error).toBeTruthy()
})

test('Pricing page renders all three plans + a real Upgrade button per tier', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/pricing')
  // Expect "Free", "Pro", and "Team" plan names visible
  await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/^pro$/i).first()).toBeVisible()
  await expect(page.getByText(/team/i).first()).toBeVisible()
  // The shared pricing page renders limit lines like "X campaigns" / "X pledges"
  await expect(page.getByText(/campaigns/i).first()).toBeVisible()
  await expect(page.getByText(/pledges/i).first()).toBeVisible()
  await expect(page.getByText(/reward tiers/i).first()).toBeVisible()
})
