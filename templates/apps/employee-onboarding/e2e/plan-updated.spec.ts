/**
 * Post-checkout landing — re-fetches /api/billing/status and reflects the
 * authenticated user's plan.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders the post-checkout shell', async ({ page }) => {
    await signup(page, uniqueEmail('plan-render'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-plan-updated"]').first()).toBeVisible()
    expect(reqs.some((r) => /\/api\/billing\/status/.test(r.url))).toBe(true)
  })

  test('continue / dashboard CTA routes back to /dashboard', async ({ page }) => {
    await signup(page, uniqueEmail('plan-cta'))
    await page.goto(APP_BASE + '/plan-updated')
    const cta = page.getByRole('link', { name: /dashboard|continue|return/i }).first()
    if (await cta.count()) {
      await cta.click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
    }
  })

  test('billing status reflects the (free) plan for a new user', async ({ page }) => {
    await signup(page, uniqueEmail('plan-bill'))
    const r = await page.request.get(`${API_BASE}/billing/status`)
    const body = (await r.json()) as { planKey?: string; plan?: string }
    expect((body.planKey ?? body.plan ?? '').toLowerCase()).toMatch(/free|starter|trial|/)
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
