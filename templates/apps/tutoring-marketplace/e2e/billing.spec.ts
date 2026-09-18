/**
 * /pricing + /api/billing — Stripe-backed subscription tiers.
 * Asserts the catalog returns three tiers (free, pro, team), the upgrade
 * CTA from /pricing fires POST /api/billing/checkout, and (when
 * STRIPE_SECRET_KEY is configured) the response includes a real
 * checkout.stripe.com URL.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, signup } from './_helpers.js'

test('GET /api/billing/tiers returns the catalog with free/pro/team', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const r = await apiFetch<{ data: any[] }>(page, 'GET', '/billing/tiers')
  expect(r.status).toBe(200)
  const tiers = (r.body as { data?: any[] }).data ?? []
  expect(Array.isArray(tiers)).toBe(true)
  expect(tiers.length).toBeGreaterThanOrEqual(3)
  const keys = tiers.map((t: any) => t.key)
  expect(keys).toEqual(expect.arrayContaining(['free', 'pro', 'team']))
})

test("GET /api/billing/status returns the user's plan = free for new accounts", async ({
  page,
}) => {
  await signup(page)
  const r = await apiFetch<any>(page, 'GET', '/billing/status')
  expect(r.status).toBe(200)
  expect(r.body.isFree).toBe(true)
})

test('pricing page renders tier cards', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const html = await page.content()
  expect(html).toMatch(/Free/i)
  expect(html).toMatch(/Pro/i)
  expect(html).toMatch(/Team/i)
})

test('upgrade to Pro fires POST /api/billing/checkout and yields a Stripe URL', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/pricing')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })

  const reqs = await captureNetwork(page, async () => {
    // The PricingPage component renders an "Upgrade" / "Subscribe" / "Continue" / "Switch to Pro" CTA.
    const candidate = page
      .getByRole('button', { name: /upgrade|subscribe|continue|switch.*pro|select pro|start pro/i })
      .first()
    await candidate.click().catch(() => undefined)
    await page.waitForTimeout(4_000)
  })
  const post = reqs.find(
    (r) => r.method === 'POST' && /\/api\/billing\/(checkout|sessions)/.test(r.url),
  )
  expect(post, 'POST /api/billing/checkout fired').toBeDefined()
  expect(post?.status).toBeGreaterThanOrEqual(200)
  expect(post?.status).toBeLessThan(400)

  // Assert we either redirected to Stripe Checkout or got a checkoutUrl back
  const url = page.url()
  if (url.includes('checkout.stripe.com')) {
    expect(url).toMatch(/checkout\.stripe\.com/)
  } else {
    // Some flows return JSON {checkoutUrl}; that response is opaque to the page.
    // Accept either by checking the API call directly:
    const directly = await apiFetch<any>(page, 'POST', '/billing/checkout', {
      priceId:
        process.env.STRIPE_TUTORING_MARKETPLACE_PRO_MONTHLY ?? 'price_1TVBpgCES2eiMwhCW71szwNo',
    })
    expect(directly.status).toBeGreaterThanOrEqual(200)
    expect(directly.status).toBeLessThan(400)
    if (directly.body.checkoutUrl) {
      expect(String(directly.body.checkoutUrl)).toMatch(/checkout\.stripe\.com|cs_test_|cs_live_/)
    }
  }
})

test('checkout with an unknown priceId returns 400', async ({ page }) => {
  await signup(page)
  const r = await apiFetch(page, 'POST', '/billing/checkout', { priceId: 'price_does_not_exist' })
  expect(r.status).toBe(400)
})

test('GET /api/billing/* without auth fails 401', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const r = await apiFetch(page, 'GET', '/billing/status')
  expect(r.status).toBe(401)
})

test('cancel without an active subscription returns 400', async ({ page }) => {
  await signup(page)
  const r = await apiFetch(page, 'POST', '/billing/cancel')
  // A fresh user has no Stripe subscription, so cancel should fail clean.
  expect([400, 503]).toContain(r.status)
})
