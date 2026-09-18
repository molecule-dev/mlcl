/**
 * Subscribe contract: BoxDetail + Billing flows actually drive Stripe
 * Checkout (when stripe_price_id is present) AND create real DB rows
 * (subscription + pending box + box_items) when subscribing locally.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  fetchMineSubscription,
  fetchPlans,
  fetchUpcomingBox,
  signup,
} from './_helpers.js'

test('POST /api/billing/checkout returns a real Stripe Checkout URL', async ({ page }) => {
  const { accessToken } = await signup(page)
  // Use the live Pro Monthly priceId from /api/billing/tiers (real Stripe price)
  const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
    headers: apiHeaders(accessToken),
  })
  expect(tiersRes.status()).toBe(200)
  const tiers = (await tiersRes.json()) as {
    data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
  }
  const priceId = tiers.data.flatMap((t) => t.prices).find((p) => p.stripePriceId)?.stripePriceId
  expect(priceId, 'at least one tier price has a stripePriceId').toBeTruthy()

  const res = await page.request.post(`${API_BASE}/billing/checkout`, {
    headers: apiHeaders(accessToken),
    data: { priceId },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  const body = (await res.json()) as { checkoutUrl?: string }
  expect(body.checkoutUrl, 'real Stripe checkout URL').toMatch(/checkout\.stripe\.com|cs_test_/)
})

test('POST /api/subscriptions creates a subscription + pending box with seeded items', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  const plan = plans[0]

  const res = await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plan.id, paymentMethodId: 'manual', preferences: {} },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string; status: string; plan_id: string }
  expect(body.id).toBeTruthy()
  expect(body.status).toBe('active')
  expect(body.plan_id).toBe(plan.id)

  // Read-after-write: subscriptions/mine reflects the new sub
  const sub = await fetchMineSubscription(page, accessToken)
  expect(sub?.id).toBe(body.id)
  expect(sub?.status).toBe('active')
  expect(sub?.plan_id).toBe(plan.id)

  // Pending box was auto-created with the plan's included items
  const box = await fetchUpcomingBox(page, accessToken)
  expect(box, 'upcoming box created on subscribe').toBeTruthy()
  expect(box?.status).toBe('pending')
  expect(Array.isArray(box?.items)).toBe(true)
  expect(box?.items.length).toBe(plan.included_items.length)
})

test('POST /api/subscriptions twice on the same user returns 409', async ({ page }) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  const plan = plans[0]
  const headers = apiHeaders(accessToken)

  const first = await page.request.post(`${API_BASE}/subscriptions`, {
    headers,
    data: { planId: plan.id, paymentMethodId: 'manual', preferences: {} },
  })
  expect(first.status()).toBe(201)

  const second = await page.request.post(`${API_BASE}/subscriptions`, {
    headers,
    data: { planId: plan.id, paymentMethodId: 'manual', preferences: {} },
    failOnStatusCode: false,
  })
  expect(second.status()).toBe(409)
})

test('Subscribe via UI on /boxes/:id (Stripe path) navigates to a real checkout URL', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  const stripePlan = plans.find((p) => p.stripe_price_id)
  test.skip(!stripePlan, 'no plan has a stripe_price_id in this env')

  await page.goto(APP_BASE + `/boxes/${stripePlan!.id}`)
  await expect(page.getByTestId('box-detail')).toBeVisible()
  // Click "Subscribe" — the page redirects via window.location.href
  // to the Stripe checkout URL. Wait for that URL.
  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 30_000 }),
    page.getByTestId('box-detail-subscribe').click(),
  ])
  expect(page.url()).toMatch(/checkout\.stripe\.com|cs_test_/)
})

test('After subscribing locally, dashboard shows the active subscription view', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  // Pick the plan with the smallest included_items count (Curator first)
  const plan = plans[0]
  const res = await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plan.id, paymentMethodId: 'manual', preferences: {} },
  })
  expect(res.status()).toBe(201)

  await page.goto(APP_BASE + '/dashboard')
  await expect(page.getByTestId('dashboard-active')).toBeVisible()
  await expect(page.getByTestId('dashboard-active')).toContainText(plan.name)
  await expect(page.getByTestId('dashboard-customize')).toBeVisible()
  await expect(page.getByTestId('dashboard-track')).toBeVisible()
})
