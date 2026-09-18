import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, getBillingStatus, listTiers, signup } from './_helpers.js'

test.describe('Pricing + billing — tiers + status round-trip', () => {
  test('Pricing page renders all tiers from /api/billing/tiers', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(page.getByText(/Free/i).first()).toBeVisible()
    await expect(page.getByText(/Pro/i).first()).toBeVisible()
    await expect(page.getByText(/Team/i).first()).toBeVisible()
  })

  test('Pricing copy quotes the SAME limits the API enforces (no drift)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const tiers = await listTiers(page, accessToken)
    const free = tiers.find((t) => t.key === 'free')
    expect(free).toBeTruthy()
    const limits = free!.limits as Record<string, number>
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    // The Free column must surface the maxDevices number we expose via the API.
    await expect(
      page.getByText(new RegExp(`${limits.maxDevices}\\s+devices`, 'i')).first(),
    ).toBeVisible()
  })

  test('billing status is "free" by default', async ({ page }) => {
    const { accessToken } = await signup(page)
    const status = await getBillingStatus(page, accessToken)
    expect(status.planKey).toBe('free')
    expect(status.isFree).toBe(true)
    expect(status.limits).toBeDefined()
  })

  test('Stripe checkout is unavailable in test env → POST returns explicit error, no silent success', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // The smoke environment has placeholder Stripe keys, so checkout MUST fail
    // explicitly rather than silently appear to succeed. We accept any 4xx/5xx.
    const res = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { tier: 'pro', period: 'month' },
      failOnStatusCode: false,
    })
    // Either the API returns a redirect URL (real Stripe) or a 4xx with a body.
    // We only fail if the response is a 200 with a missing/empty url AND no error.
    if (res.status() < 300) {
      const body = (await res.json().catch(() => ({}))) as { url?: string }
      expect(body.url, 'success response must contain a real Stripe URL').toBeTruthy()
    } else {
      expect(res.status()).toBeGreaterThanOrEqual(400)
    }
  })

  test('PlanUpdated thank-you page renders with a link home', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    // The page renders a heading with the i18n key "planUpdated.message" or
    // its english fallback. We assert on the link instead since the heading
    // text varies by translation.
    await expect(page.getByRole('link', { name: /home|return/i }).first()).toBeVisible()
  })
})
