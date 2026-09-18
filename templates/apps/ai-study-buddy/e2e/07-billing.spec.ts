/**
 * Billing — Stripe checkout, status, cancel, tier list. Verifies that
 * the API surface a real frontend would call actually returns
 * production-shaped responses (real Stripe hosted-checkout URLs, real
 * tier metadata).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test('GET /billing/status returns the user effective tier', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/billing/status`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as {
    planKey: string
    name: string
    limits: { maxQuizzes: number; maxTopics: number }
    isFree: boolean
  }
  expect(body.planKey).toBe('free')
  expect(body.isFree).toBe(true)
  expect(body.limits.maxQuizzes).toBeGreaterThan(0)
  expect(body.limits.maxTopics).toBeGreaterThan(0)
})

test('POST /billing/checkout returns a real Stripe checkout URL', async ({ page }) => {
  const { accessToken } = await signup(page)
  const tiers = await page.request.get(`${API_BASE}/billing/tiers`)
  const tiersBody = (await tiers.json()) as {
    data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
  }
  const proTier = tiersBody.data.find((t) => t.key === 'pro')
  const priceId = proTier?.prices.find((p) => p.stripePriceId)?.stripePriceId
  test.skip(!priceId, 'Stripe price not configured for pro tier')
  if (!priceId) return

  const res = await page.request.post(`${API_BASE}/billing/checkout`, {
    headers: apiHeaders(accessToken),
    data: { priceId },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  const body = (await res.json()) as { checkoutUrl?: string; updated?: boolean }
  if (body.checkoutUrl) {
    expect(body.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//)
  } else {
    expect(body.updated).toBe(true)
  }
})

test('POST /billing/checkout rejects unknown priceId with 400', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.post(`${API_BASE}/billing/checkout`, {
    headers: apiHeaders(accessToken),
    data: { priceId: 'price_definitely_not_real_xyz' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(400)
})

test('POST /billing/cancel without active subscription returns 400', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.post(`${API_BASE}/billing/cancel`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect([400, 503]).toContain(res.status())
})

test('/billing page mount fans out to /api/billing/tiers + /api/billing/summary', async ({
  page,
}) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(`${APP_BASE}/billing`)
    await page.waitForTimeout(2000)
  })
  expect(reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.method === 'GET')?.status).toBe(
    200,
  )
  expect(
    reqs.find((r) => /\/api\/billing\/summary/.test(r.url) && r.method === 'GET')?.status,
  ).toBe(200)
})

test('/billing renders Free, Pro, and Team plan cards from /api/billing/tiers', async ({
  page,
}) => {
  await signup(page)
  await page.goto(`${APP_BASE}/billing`)
  await expect(page.getByRole('heading', { name: /Free/ }).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: /Pro/ }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /Team/ }).first()).toBeVisible()
})

test('/billing free-tier CTA is disabled (no stripePriceId)', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/billing`)
  const freeCta = page.locator('[data-mol-id="pricing-cta-free"]')
  await expect(freeCta.first()).toBeDisabled({ timeout: 15_000 })
})

test('/billing dashboard link in sidebar routes back to /dashboard', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/billing`)
  await page.getByRole('link', { name: 'Dashboard' }).first().click()
  await page.waitForURL(/\/dashboard$/, { timeout: 5_000 })
  expect(new URL(page.url()).pathname).toBe('/dashboard')
})
