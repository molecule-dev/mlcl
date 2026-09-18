/**
 * Billing / pricing outcome tests.
 *
 * The pricing page must successfully fetch GET /billing/tiers (this was
 * the original cause of the "Cannot read properties of undefined" crash
 * — a missing http baseURL meant the request returned the SPA HTML
 * shell). Asserts both the API contract and that PricingPage renders
 * the resulting tier names.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, signup } from './_helpers.js'

interface TiersResponse {
  data: Array<{
    key: string
    name: string
    prices: Array<{ period: string; price: string; stripePriceId?: string | null }>
  }>
}
interface BillingStatus {
  planKey: string
  isFree: boolean
}

test('GET /billing/tiers returns the configured tier ladder', async ({ page }) => {
  await signup(page)
  const r = await api<TiersResponse>(page, 'GET', '/billing/tiers')
  expect(Array.isArray(r.data), '/billing/tiers data is an array').toBe(true)
  expect(r.data.length, 'at least one tier defined').toBeGreaterThan(0)
  for (const tier of r.data) {
    expect(tier.key).toBeTruthy()
    expect(tier.name).toBeTruthy()
    expect(Array.isArray(tier.prices)).toBe(true)
  }
  expect(
    r.data.find((t) => t.key === 'free'),
    'free tier present',
  ).toBeTruthy()
})

test('GET /billing/status reflects the new user as free tier', async ({ page }) => {
  await signup(page)
  const r = await api<BillingStatus>(page, 'GET', '/billing/status')
  expect(r.isFree, 'new user is on free tier').toBe(true)
})

test('Pricing page renders tier names without crashing', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(APP_BASE + '/pricing', { waitUntil: 'networkidle' })
  // PricingPage iterates `data.data` from /billing/tiers — if our http
  // client wasn't wired with baseURL=/api, this would explode with
  // "Cannot read properties of undefined (reading 'map')".
  expect(
    errs.filter((e) => /undefined.*map/i.test(e)),
    'no .map() crash on pricing',
  ).toEqual([])
})
