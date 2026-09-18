import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated (PlanUpdated)', () => {
  test('Plan-updated page renders confirmation heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page).toHaveURL(/\/plan-updated/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })

  test('Return-home CTA navigates to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page
      .getByRole('link', { name: /return (to )?home|back to (home|dashboard)|go to dashboard/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })

  test('GET /api/billing/status confirms current plan', async ({ page }) => {
    await signup(page)
    const status = await api<Record<string, unknown>>(page, 'GET', '/billing/status')
    expect(status).toBeTruthy()
  })

  test('Page mount captures /billing/status (current plan check)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      // Allow any post-mount fetches to complete.
      await page.waitForTimeout(750)
    })
    const billingStatus = reqs.find(
      (r) => /\/api\/billing\/status/.test(r.url) && r.method === 'GET',
    )
    expect(billingStatus, 'GET /api/billing/status must fire on plan-updated mount').toBeTruthy()
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
