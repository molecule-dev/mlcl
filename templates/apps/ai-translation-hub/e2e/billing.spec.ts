import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('billing', () => {
  test('current plan renders from /api/billing/status', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(res.status()).toBeLessThan(300)
    const body = (await res.json()) as { name?: string; planKey?: string }
    expect(body.name ?? body.planKey).toBeTruthy()

    await page.goto(APP_BASE + '/billing')
    const planLabel = page.locator('p[data-mol-id="billing-current-plan-name"]').first()
    await expect(planLabel).toContainText(body.name ?? '', { timeout: 10_000 })
  })

  test('tiers grid renders all returned tiers', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/billing')
    const tiers = page.locator('[data-mol-id="billing-tiers"] [data-mol-id^="billing-tier-"]')
    await expect.poll(async () => await tiers.count(), { timeout: 10_000 }).toBeGreaterThan(0)
    // At least the free tier is present.
    await expect(page.locator('[data-mol-id="billing-tier-free"]').first()).toBeVisible()
  })

  test('page load fires /api/reports/billing_usage + /api/billing/{tiers,status}', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/billing')
      await Promise.all([
        page.waitForResponse((r) => /\/api\/billing\/tiers/.test(r.url()) && r.status() === 200, {
          timeout: 15_000,
        }),
        page.waitForResponse((r) => /\/api\/billing\/status/.test(r.url()) && r.status() === 200, {
          timeout: 15_000,
        }),
        page.waitForResponse(
          (r) => /\/api\/reports\/billing_usage/.test(r.url()) && r.status() === 200,
          { timeout: 15_000 },
        ),
      ])
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url)),
    ).toBeDefined()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url)),
    ).toBeDefined()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/reports\/billing_usage/.test(r.url)),
    ).toBeDefined()
  })
})
