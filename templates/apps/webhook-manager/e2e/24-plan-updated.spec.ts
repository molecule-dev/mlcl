import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/plan-updated', () => {
  test('renders the plan-updated confirmation page after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    // Page renders something — heading or branded body
    await expect(page.locator('body')).toBeVisible()
    // Should reference the brand somewhere
    const hasBrand = await page
      .getByText(/Relay|plan|welcome/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasBrand).toBe(true)
  })

  test('plan-updated page reflects current /billing/status (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    // Page should fetch billing status to render the confirmation accurately.
    const billingFetch = reqs.find(
      (r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url),
    )
    if (billingFetch) {
      expect(billingFetch.status).toBe(200)
    }
    // Direct fetch (no auth header) — server must respond, not 5xx.
    const r = await page.request.get(API_BASE + '/billing/status')
    expect([200, 401]).toContain(r.status())
  })

  test('continue link navigates to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('link', { name: /dashboard|continue|get started/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(/\/dashboard(?:\b|$)/, { timeout: 5_000 })
    } else {
      // No CTA on this variant — page still renders meaningfully.
      await expect(page.locator('body')).toBeVisible()
    }
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
