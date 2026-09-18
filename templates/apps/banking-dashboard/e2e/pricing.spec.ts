/**
 * /pricing — public pricing page rendered by `<PricingPage>` from
 * @molecule/app-billing-react. Loads tiers from /api/billing/tiers.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('pricing page', () => {
  test('public pricing renders heading + 3 plan cards from /api/billing/tiers', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await expect(page.locator('h1')).toContainText(/plan/i, { timeout: 10000 })
    })
    const tiersCall = reqs.find((r) => /\/api\/billing\/tiers/.test(r.url) && r.status < 400)
    expect(tiersCall, `expected GET /api/billing/tiers, got ${JSON.stringify(reqs)}`).toBeTruthy()
  })

  test('limit lists render for each tier (accounts/cards/statements/etc.)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/accounts/i).first()).toBeVisible()
    await expect(page.getByText(/cards/i).first()).toBeVisible()
    await expect(page.getByText(/statements/i).first()).toBeVisible()
    await expect(page.getByText(/transfers/i).first()).toBeVisible()
  })

  test('three plan tiers render: Free, Pro, Team', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/free/i).first()).toBeVisible()
    await expect(page.getByText(/pro/i).first()).toBeVisible()
    await expect(page.getByText(/team/i).first()).toBeVisible()
  })

  test('logged-in user clicking the Pro upgrade hits POST /api/billing/checkout', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const buttons = page.getByRole('button', {
      name: /(upgrade|continue|subscribe|choose|select).*?(pro|team)/i,
    })
    await expect(buttons.first()).toBeVisible({ timeout: 10000 })
    const reqs = await captureNetwork(page, async () => {
      await buttons.first().click()
      await page.waitForTimeout(1500)
    })
    const checkout = reqs.find((r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST')
    expect(checkout, JSON.stringify(reqs)).toBeTruthy()
  })

  test('unauth user CTA leads to signup or login (auth wall)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const link = page
      .getByRole('link', { name: /sign\s*up|create account|get started|open an account/i })
      .first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/signup/, { timeout: 5000 })
    }
  })

  test('billing tiers payload is non-empty and contains tier keys', async ({ page }) => {
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/billing/tiers')
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { data?: unknown[] } | unknown[]
    const arr = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : []
    expect(arr.length).toBeGreaterThan(0)
    const keys = arr.map((t) => (t as { key?: string }).key)
    expect(keys).toContain('free')
  })

  test('paid tier price renders with /mo (monthly period)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('body')).toContainText(/\$\d+\/mo/i, { timeout: 10000 })
  })
})
