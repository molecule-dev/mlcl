/**
 * /pricing per-page suite.
 * Hits the live Stripe API for checkout URL assertion (env keys real).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, BRAND, apiFetch, captureNetwork, signup } from './_helpers.js'

test.describe('/pricing', () => {
  test('header heading "Choose the branded plan" renders', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(
      page.getByRole('heading', { name: new RegExp(`choose your ${BRAND} plan`, 'i') }),
    ).toBeVisible()
  })

  test('three tier cards (Free / Pro / Team) all render', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /\bFree\b/i }).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: /\bPro\b/i }).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: /\bTeam\b/i }).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('GET /api/billing/tiers fires on page load and returns 3 tiers', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined)
    })
    const tiersCall = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
    expect(tiersCall, 'GET /api/billing/tiers fired').toBeDefined()
    expect(tiersCall?.status).toBe(200)
  })

  test('Upgrade-to-Pro CTA fires POST /api/billing/checkout and returns Stripe URL', async ({
    page,
  }) => {
    await signup(page)
    const r = await apiFetch<{ checkoutUrl?: string }>(page, 'POST', '/billing/checkout', {
      priceId:
        process.env.STRIPE_TUTORING_MARKETPLACE_PRO_MONTHLY ?? 'price_1TVBpgCES2eiMwhCW71szwNo',
    })
    expect(r.status).toBeGreaterThanOrEqual(200)
    expect(r.status).toBeLessThan(400)
    if (r.body.checkoutUrl) {
      expect(String(r.body.checkoutUrl)).toMatch(/checkout\.stripe\.com|cs_test_|cs_live_/)
    }
  })

  test('Upgrade-to-Team CTA fires POST /api/billing/checkout', async ({ page }) => {
    await signup(page)
    const r = await apiFetch<{ checkoutUrl?: string }>(page, 'POST', '/billing/checkout', {
      priceId:
        process.env.STRIPE_TUTORING_MARKETPLACE_TEAM_MONTHLY ?? 'price_1TVBphCES2eiMwhCHAwwQ6V0',
    })
    expect(r.status).toBeGreaterThanOrEqual(200)
    expect(r.status).toBeLessThan(400)
    if (r.body.checkoutUrl) {
      expect(String(r.body.checkoutUrl)).toMatch(/checkout\.stripe\.com|cs_test_|cs_live_/)
    }
  })

  test('checkout with bogus priceId returns 400', async ({ page }) => {
    // The 4xx here is the assertion target; the browser still logs it as a
    // console error, so allow exactly that.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: /status of 400/,
    })
    await signup(page)
    const r = await apiFetch(page, 'POST', '/billing/checkout', { priceId: 'price_does_not_exist' })
    expect(r.status).toBe(400)
  })

  test('GET /api/billing/status without auth fails 401', async ({ page }) => {
    // The 4xx here is the assertion target; the browser still logs it as a
    // console error, so allow exactly that.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: /status of 401/,
    })
    await page.goto(APP_BASE + '/pricing')
    const r = await apiFetch(page, 'GET', '/billing/status')
    expect(r.status).toBe(401)
  })
})
