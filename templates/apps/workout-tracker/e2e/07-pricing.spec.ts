import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, captureNetwork, API_BASE } from './_helpers.js'

test.describe('/pricing + checkout', () => {
  test('public /pricing renders 3 tiers with upgrade buttons', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle').catch(() => null)

    // Heading and tier names visible.
    await expect(
      page
        .locator('h1, h2')
        .filter({ hasText: /Choose your.*plan/i })
        .first(),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/^Free$/i).first()).toBeVisible()
    await expect(page.getByText(/^Pro$/i).first()).toBeVisible()
    await expect(page.getByText(/^Team$/i).first()).toBeVisible()

    // Upgrade affordances exist.
    const upgradeBtns = page.getByRole('button', { name: /upgrade/i })
    await expect(upgradeBtns.nth(1)).toBeAttached()
  })

  test('GET /api/billing/tiers exposes free + pro + team plan keys', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/billing/tiers`)
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    const tiers = Array.isArray(body) ? body : (body?.tiers ?? body?.data)
    expect(Array.isArray(tiers)).toBe(true)
    const keys = tiers.map((tier: { key?: string }) => tier.key)
    expect(keys).toContain('free')
    expect(keys).toContain('pro')
    expect(keys).toContain('team')
  })

  test('clicking Upgrade to Pro POSTs /billing/checkout and redirects to a real Stripe session', async ({
    page,
  }) => {
    await signup(page)
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle').catch(() => null)

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /upgrade.*pro/i })
        .first()
        .click()
      // Real Stripe redirect happens after checkout returns 200 with checkoutUrl.
      await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 })
    })

    const checkout = reqs.find((r) => /\/billing\/checkout/.test(r.url) && r.method === 'POST')
    expect(checkout, 'POST /api/billing/checkout was not made').toBeTruthy()
    expect(checkout!.status, `POST /billing/checkout status`).toBe(200)
    expect(page.url(), 'should have navigated off-app to Stripe Checkout').toMatch(
      /checkout\.stripe\.com.*cs_test_/,
    )
  })

  test('plan-updated success page shows the upgrade copy', async ({ page }) => {
    await signup(page)
    await page.goto('/plan-updated')
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(
      page
        .locator('h1')
        .filter({ hasText: /plan.*updated/i })
        .first(),
    ).toBeVisible({ timeout: 15000 })
  })

  test('plan-updated cancelled state shows cancellation copy', async ({ page }) => {
    await signup(page)
    await page.goto('/plan-updated?cancelled=1')
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(
      page
        .locator('h1')
        .filter({ hasText: /cancel/i })
        .first(),
    ).toBeVisible({ timeout: 15000 })
  })
})
