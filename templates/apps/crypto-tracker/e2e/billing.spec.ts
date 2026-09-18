import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { signup, APP_BASE, captureNetwork } from './_helpers'

/**
 * Billing/checkout flow — proves real Stripe integration, not a fake
 * 200 from a stubbed handler. The /api/billing/checkout call must
 * return a real `https://checkout.stripe.com/...` URL backed by the
 * STRIPE_CRYPTO_TRACKER_PRO_MONTHLY price configured in
 * .env.flagship-rollout.
 */

test('GET /api/billing/tiers returns the configured pricing tiers', async ({ page }) => {
  await signup(page)
  const data = await page.evaluate(async () => {
    const r = await fetch('/api/billing/tiers')
    return r.json()
  })
  const tiers = Array.isArray(data) ? data : (data.data ?? [])
  const keys = tiers.map((t: { key: string }) => t.key)
  expect(keys).toEqual(expect.arrayContaining(['free', 'pro', 'team']))
  // Pro must have a real Stripe priceId surfaced from env.
  const pro = tiers.find((t: { key: string }) => t.key === 'pro')
  expect(pro).toBeTruthy()
  const monthlyPrice = pro.prices.find((p: { period: string }) => p.period === 'month')
  expect(
    monthlyPrice?.stripePriceId,
    'STRIPE_CRYPTO_TRACKER_PRO_MONTHLY must resolve in fill-smoke-env',
  ).toMatch(/^price_/)
})

test('GET /api/billing/status returns a free-tier shape for a fresh user', async ({ page }) => {
  await signup(page)
  const out = await page.evaluate(async () => {
    const r = await fetch('/api/billing/status', { headers: { accept: 'application/json' } })
    const text = await r.text()
    return {
      status: r.status,
      contentType: r.headers.get('content-type') || '',
      body: text.slice(0, 200),
    }
  })
  expect(out.status, `unexpected status, body=${out.body}`).toBe(200)
  expect(out.contentType, `unexpected content-type, body=${out.body}`).toMatch(/application\/json/)
  const status = JSON.parse(out.body)
  expect(status.planKey).toBe('free')
  expect(status.category).toBe('free')
  expect(status.isFree).toBe(true)
  expect(status.limits).toBeTruthy()
  expect(status.limits.maxAlerts).toBeGreaterThan(0)
})

test('POST /api/billing/checkout returns a real Stripe Checkout URL for the pro priceId', async ({
  page,
}) => {
  await signup(page)
  // Look up the priceId from /tiers so the test is keyed off the same
  // env the running server is using (avoids drift if the env changes).
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
  // Either a real Stripe checkout session URL OR an `updated:true` payload
  // (the Stripe bond may take the "update existing subscription" path).
  // For a brand-new user there is no existing sub, so we expect checkoutUrl.
  expect(out.body.checkoutUrl, JSON.stringify(out.body)).toMatch(
    /^https:\/\/checkout\.stripe\.com\//,
  )
})

test('POST /api/billing/checkout rejects an unknown priceId', async ({ page }) => {
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

test('Pricing page "Upgrade to Pro" routes the browser to a real Stripe Checkout URL', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible()
  // captureNetwork is set up to record the /api/billing/checkout POST that
  // the Pricing page issues before redirecting to Stripe.
  const reqs = await captureNetwork(page, async () => {
    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com\/.*cs_(test|live)_/, { timeout: 15_000 }),
      page.getByRole('button', { name: /upgrade to pro/i }).click(),
    ])
  })
  expect(page.url()).toMatch(/^https:\/\/checkout\.stripe\.com\//)
  const checkoutCall = reqs.find(
    (r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST',
  )
  expect(checkoutCall, 'Pricing page must POST to /api/billing/checkout').toBeTruthy()
  expect(checkoutCall!.status).toBeLessThan(400)
})
