import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, requireAccessToken, signup } from './_helpers'

test.describe('/settings/billing', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('renders the billing heading and current plan', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await expect(page.getByRole('heading', { level: 1, name: /billing/i })).toBeVisible()
    await expect(page.locator('[data-mol-id="billing-current-plan"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="billing-plan-name"]')).toBeVisible()
  })

  test('GET /api/billing/status and /api/billing/tiers fire on render', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings/billing')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url)),
    ).toBeDefined()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url)),
    ).toBeDefined()
  })

  test('Free user starts on the Free plan', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const r = await page.request.get(API_BASE + '/billing/status', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const status = await r.json()
    expect(status.isFree).toBe(true)
    expect(status.planKey).toBe('free')
    expect(status.limits).toBeDefined()
  })

  test('clicking Change plan reveals the tier list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await page.locator('[data-mol-id="billing-change-plan"]').click()
    await expect(page.locator('[data-mol-id="billing-plans"]')).toBeVisible()
  })

  test('clicking Subscribe on Pro POSTs /billing/checkout and either updates or returns checkoutUrl', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings/billing')
    await page.locator('[data-mol-id="billing-change-plan"]').click()
    // Pick the first non-free tier subscribe button
    const reqs = await captureNetwork(page, async () => {
      const buttons = page.locator('button[data-mol-id^="billing-tier-subscribe-"]')
      const count = await buttons.count()
      // Prefer pro tier, fall back to first non-free
      let clicked = false
      for (let i = 0; i < count; i++) {
        const id = (await buttons.nth(i).getAttribute('data-mol-id')) ?? ''
        if (id.includes('pro') || id.includes('scale') || id.includes('team')) {
          await buttons.nth(i).click()
          clicked = true
          break
        }
      }
      if (!clicked && count > 0) await buttons.first().click()
      await page.waitForTimeout(3500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/billing\/checkout/.test(r.url))
    expect(post, 'POST /api/billing/checkout').toBeDefined()
    expect(post!.status).toBeLessThan(400)
  })
})
