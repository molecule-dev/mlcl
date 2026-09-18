/**
 * /pricing — pricing tier page with real Stripe checkout CTAs.
 *
 * Per-page spec covering each row in observations/pricing.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

test('"Choose your plan" heading rendered on /pricing', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByRole('heading', { name: /choose your.*plan/i })).toBeVisible()
})

test('Free tier card rendered', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.locator('[data-mol-id="pricing-tier-free"]')).toBeVisible({ timeout: 15_000 })
})

test('Pro tier card rendered', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.locator('[data-mol-id="pricing-tier-pro"]')).toBeVisible({ timeout: 15_000 })
})

test('Team tier card rendered', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.locator('[data-mol-id="pricing-tier-team"]')).toBeVisible({ timeout: 15_000 })
})

test('Upgrade CTA → real Stripe Checkout URL', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/pricing')
  const cta = page.locator('[data-mol-id^="pricing-cta-"]:not([disabled])').first()
  await expect(cta).toBeVisible({ timeout: 15_000 })
  const { reqs } = await captureNetwork(page, async () => {
    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com\/(c\/pay\/)?cs_test_/, { timeout: 30_000 }),
      cta.click(),
    ])
  })
  expect(page.url()).toMatch(/checkout\.stripe\.com\/(c\/pay\/)?cs_test_/)
  const checkout = reqs.find((r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST')
  expect(checkout, 'POST /api/billing/checkout should fire').toBeTruthy()
  expect(checkout!.status).toBe(200)
})

test('GET /api/billing/tiers returns ≥1 tier with prices', async ({ request }) => {
  const r = await request.get(`${API_BASE}/billing/tiers`)
  expect(r.status()).toBe(200)
  const tiers = (await r.json()).data as {
    key: string
    prices: { stripePriceId: string | null }[]
  }[]
  expect(tiers.length).toBeGreaterThanOrEqual(1)
  expect(tiers.some((t) => t.prices.some((p) => p.stripePriceId))).toBe(true)
})
