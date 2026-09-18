import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /settings/billing — plan summary + change-plan picker. Real Stripe
// checkout returns checkoutUrl matching checkout.stripe.com/c/pay/cs_test_.

test.describe('/settings/billing', () => {
  test('GET /api/billing + GET /api/billing/tiers fire on mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings/billing')
      await page.getByRole('heading', { name: /Plan and invoices/i }).waitFor({ timeout: 15_000 })
      await page.waitForTimeout(1500)
    })
    const billing = reqs.find((r) => /\/api\/billing(\?|$)/.test(r.url) && r.method === 'GET')
    const tiers = reqs.find((r) => /\/api\/billing\/tiers(\?|$)/.test(r.url) && r.method === 'GET')
    expect(billing, 'GET /api/billing should fire').toBeTruthy()
    expect(billing!.status).toBe(200)
    expect(tiers, 'GET /api/billing/tiers should fire').toBeTruthy()
    expect(tiers!.status).toBe(200)
  })

  test('Change plan opens the data-testid="plan-picker" surface', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await page.getByRole('heading', { name: /Plan and invoices/i }).waitFor({ timeout: 15_000 })
    await page.getByRole('button', { name: /change plan/i }).click()
    await expect(page.locator('[data-testid="plan-picker"]')).toBeVisible({ timeout: 5_000 })
  })

  test('Plan-picker upgrade fires POST /api/billing/checkout returning a real Stripe URL', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await page.getByRole('button', { name: /change plan/i }).click()
    await page.locator('[data-testid="plan-picker"]').waitFor({ timeout: 10_000 })
    // Block the navigation so we can read the JSON body before the
    // browser follows the Stripe redirect.
    await page.route(/checkout\.stripe\.com/, (route) => route.abort('aborted'))
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/billing\/checkout(\?|$)/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      page.locator('[data-testid="plan-picker"] button:not([disabled])').first().click(),
    ])
    expect(resp.status(), 'checkout endpoint must succeed').toBe(200)
    const body = await resp.json()
    expect(body?.checkoutUrl, 'returned URL must be a real Stripe checkout URL').toMatch(
      /https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/,
    )
  })
})
