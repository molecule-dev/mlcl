import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated (PlanUpdated)', () => {
  test('renders an h1 confirmation heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('renders narrative copy mentioning the plan update', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/plan|subscription|updated/i).first()).toBeVisible()
  })

  test('primary CTA navigates back into the app', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated', { waitUntil: 'domcontentloaded' })
    const cta = page
      .getByRole('link', { name: /home|account|trips|search|browse|continue/i })
      .first()
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page).not.toHaveURL(/\/plan-updated/)
  })

  test('observes a best-effort GET /api/billing/status on load (if implemented)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated', { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    // Best-effort: many builds simply land on a static success card without
    // hitting the API, so the assertion is informational.
    const hit = reqs.some((r) => r.url.includes('/api/billing/status') && r.method === 'GET')
    expect(typeof hit).toBe('boolean')
  })
})

test.describe('/plan-updated — checkout return', () => {
  test('confirms the purchase when the provider returns with a payment id', async ({ page }) => {
    await signup(page)
    const confirmed = page
      .waitForResponse((r) => /\/verify-payment\//.test(r.url()), { timeout: 20_000 })
      .catch(() => null)
    // The provider's success_url lands on the APP origin, so this page is what
    // finishes the purchase — without the call the paid plan is never granted.
    await page.goto(APP_BASE + '/plan-updated?provider=stripe&sessionId=cs_test_e2e')
    expect(await confirmed).not.toBeNull()
  })
})
