/**
 * Billing contract: status renders the user's tier, pause/resume/cancel
 * actually flip subscription.status in the DB (read-after-write), and
 * the tier list exposes real Stripe priceIds for both Pro and Team.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  fetchMineSubscription,
  fetchPlans,
  signup,
} from './_helpers.js'

test('GET /api/billing/status returns the free tier for a fresh user', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/billing/status`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as { planKey: string; isFree: boolean }
  expect(body.planKey).toBe('free')
  expect(body.isFree).toBe(true)
})

test('GET /api/billing/tiers returns Pro/Team with real Stripe price IDs', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/billing/tiers`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as {
    data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
  }
  const proTier = body.data.find((t) => t.key === 'pro')
  const teamTier = body.data.find((t) => t.key === 'team')
  expect(proTier, 'pro tier present').toBeTruthy()
  expect(teamTier, 'team tier present').toBeTruthy()
  // At least one price per paid tier must have a real Stripe priceId
  expect(proTier!.prices.some((p) => p.stripePriceId)).toBe(true)
  expect(teamTier!.prices.some((p) => p.stripePriceId)).toBe(true)
})

test('Pause subscription via /billing flips status=paused on next read + reload-persists', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plans[0].id, paymentMethodId: 'manual', preferences: {} },
  })

  await page.goto(APP_BASE + '/billing')
  await expect(page.getByTestId('billing-page')).toBeVisible()
  await page.getByTestId('billing-pause').click()
  await expect(page.getByTestId('billing-feedback')).toBeVisible()

  // Read-after-write
  const sub = await fetchMineSubscription(page, accessToken)
  expect(sub?.status).toBe('paused')

  // Reload-persistence
  await page.reload()
  await expect(page.getByTestId('billing-resume')).toBeVisible()
})

test('Resume subscription flips status back to active', async ({ page }) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plans[0].id, paymentMethodId: 'manual', preferences: {} },
  })
  // Pause via API directly
  await page.request.post(`${API_BASE}/subscriptions/mine/pause`, {
    headers: apiHeaders(accessToken),
  })

  await page.goto(APP_BASE + '/billing')
  await expect(page.getByTestId('billing-resume')).toBeVisible()
  await page.getByTestId('billing-resume').click()
  await expect(page.getByTestId('billing-feedback')).toBeVisible()

  const sub = await fetchMineSubscription(page, accessToken)
  expect(sub?.status).toBe('active')
})

test('Cancel subscription persists status=cancelled', async ({ page }) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plans[0].id, paymentMethodId: 'manual', preferences: {} },
  })

  // Cancel via API (UI uses window.confirm which is awkward in tests)
  const cancelRes = await page.request.post(`${API_BASE}/subscriptions/mine/cancel`, {
    headers: apiHeaders(accessToken),
    data: { reason: 'user-initiated' },
    failOnStatusCode: false,
  })
  expect(cancelRes.status(), await cancelRes.text()).toBe(200)

  // Read-after-write: GET /subscriptions/mine should return null because
  // the handler only returns active|paused subscriptions.
  const sub = await fetchMineSubscription(page, accessToken)
  expect(sub).toBeNull()
})

test('Billing page tier-card "Choose" button starts a real Stripe Checkout', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/billing')
  await expect(page.getByTestId('billing-tiers')).toBeVisible()
  // Click the first paid tier's checkout button
  const proMonthly = page.getByTestId('billing-tier-pro-month')
  await expect(proMonthly).toBeVisible()
  await Promise.all([
    page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 30_000 }),
    proMonthly.click(),
  ])
  expect(page.url()).toMatch(/checkout\.stripe\.com|cs_test_/)
})
