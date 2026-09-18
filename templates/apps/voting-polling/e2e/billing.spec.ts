import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, apiRaw, captureNetwork, signup } from './_helpers.js'

test('Billing page renders the current plan and tier matrix', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/billing')
  await expect(page.locator('[data-test="billing-title"]')).toBeVisible()
  // Tiers grid renders 3 plans (free, pro, team).
  await expect(page.locator('[data-test="billing-tier-free"]')).toBeVisible()
  await expect(page.locator('[data-test="billing-tier-pro"]')).toBeVisible()
  await expect(page.locator('[data-test="billing-tier-team"]')).toBeVisible()
})

test('Billing status reflects the user’s current plan (defaults to free)', async ({ page }) => {
  await signup(page)
  const status = await api<{ planKey: string; isFree: boolean; limits: { maxPolls?: number } }>(
    page,
    'GET',
    '/billing/status',
  )
  expect(status.planKey).toBe('free')
  expect(status.isFree).toBe(true)
  expect(status.limits.maxPolls).toBeGreaterThan(0)
})

test('Billing tiers endpoint exposes real Stripe priceIds for paid plans', async ({ page }) => {
  await signup(page)
  const tiers = await api<{
    data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
  }>(page, 'GET', '/billing/tiers')
  const pro = tiers.data.find((t) => t.key === 'pro')
  expect(pro, 'pro tier exposed').toBeTruthy()
  // At least one of the prices must have a real Stripe priceId from
  // .env.flagship-rollout (price_*). If this asserts null, the env is
  // mis-wired or the tier definition lost its priceId mapping.
  const hasRealPrice = (pro!.prices ?? []).some(
    (p) => typeof p.stripePriceId === 'string' && p.stripePriceId.startsWith('price_'),
  )
  expect(hasRealPrice, 'pro tier has at least one real Stripe priceId').toBe(true)
})

test('Clicking an Upgrade button on /billing actually issues POST /api/billing/checkout with a real priceId', async ({
  page,
}) => {
  // UI integration check: the click → POST plumbing is wired. We can't read
  // the response body after the navigation, so we just observe the request
  // payload (priceId is `price_*`). The Stripe side of the contract is
  // covered by the dedicated POST test below.
  await signup(page)
  await page.goto(APP_BASE + '/billing')
  const upgradeBtn = page.locator('[data-test^="billing-buy-pro-"]').first()
  await expect(upgradeBtn).toBeVisible()

  let postedPriceId: string | null = null
  const stop = (req: import('@playwright/test').Request) => {
    if (/\/api\/billing\/checkout/.test(req.url()) && req.method() === 'POST') {
      try {
        const body = JSON.parse(req.postData() || '{}') as { priceId?: string }
        postedPriceId = body.priceId ?? null
      } catch {
        /* noop */
      }
    }
  }
  page.on('request', stop)
  await upgradeBtn.click()
  await page.waitForTimeout(800)
  page.off('request', stop)

  expect(postedPriceId, 'frontend posted a priceId from tier matrix').toMatch(/^price_/)
})

test('POST /api/billing/checkout returns a real Stripe Checkout session URL for a paid priceId', async ({
  page,
}) => {
  // Outcome check: with a real Stripe-test priceId from /billing/tiers, the
  // backend must respond with a checkoutUrl that points at Stripe (or a
  // session id from Stripe — the bond may return either shape, see
  // molecule/packages/api/middleware/billing-routes/src/routes.ts).
  await signup(page)
  const tiers = await api<{
    data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
  }>(page, 'GET', '/billing/tiers')
  const proPriceId =
    tiers.data.find((t) => t.key === 'pro')?.prices.find((p) => typeof p.stripePriceId === 'string')
      ?.stripePriceId ?? null
  expect(proPriceId, 'pro priceId from /billing/tiers').toMatch(/^price_/)

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

test('Checkout endpoint rejects unknown priceId with 4xx', async ({ page }) => {
  await signup(page)
  const resp = await apiRaw(page, 'POST', '/billing/checkout', { priceId: 'price_NOT_REAL' })
  expect(resp.status()).toBeGreaterThanOrEqual(400)
})

test('observation invariant: /billing fires GET /api/billing/status and GET /api/billing/tiers', async ({
  page,
}) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/billing')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(reqs.find((r) => /\/api\/billing\/status/.test(r.url) && r.method === 'GET')).toBeTruthy()
  expect(reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')).toBeTruthy()
})
