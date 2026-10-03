import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Pricing /pricing', () => {
  test('renders three tier cards (Free / Pro / Team) with Choose your Ascent plan heading', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /choose your ascent plan/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^free$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^pro$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^team$/i })).toBeVisible()
  })

  test('Free tile has a disabled Current plan button', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /current plan/i })).toBeDisabled()
  })

  test('initial GET /api/billing/tiers fires and returns ≥3 tiers', async ({ page }) => {
    // Arm the wait BEFORE the goto: under parallel workers the dev server's
    // on-demand module compile can push the app's mount (and the fetch it
    // fires) past any fixed networkidle window, so a post-hoc capture list
    // misses the response entirely. A pre-armed waitForResponse cannot.
    const tiersResponse = page.waitForResponse(
      (r) => r.request().method() === 'GET' && /\/api\/billing\/tiers/.test(r.url()),
      { timeout: 30_000 },
    )
    await page.goto(APP_BASE + '/pricing')
    const resp = await tiersResponse
    expect(resp.status(), 'GET /api/billing/tiers should fire on Pricing render').toBe(200)
    const body = (await resp.json()) as { data?: unknown[] } | unknown[]
    expect((Array.isArray(body) ? body : body.data)?.length ?? 0).toBeGreaterThanOrEqual(3)
  })

  test('Upgrade to Pro (auth) creates a real Stripe Checkout session and redirects', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /upgrade to pro/i }).click()
      await page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 15000 })
    })
    const checkout = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
    expect(checkout, 'POST /api/billing/checkout must fire').toBeTruthy()
    expect(checkout!.status).toBe(200)
    expect(page.url()).toMatch(/checkout\.stripe\.com|cs_test_/)
  })

  test('Upgrade to Team (auth) also creates a Stripe Checkout session', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await page.getByRole('button', { name: /upgrade to team/i }).click()
    await page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 15000 })
    expect(page.url()).toMatch(/checkout\.stripe\.com|cs_test_/)
  })
})
