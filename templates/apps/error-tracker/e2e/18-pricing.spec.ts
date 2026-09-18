import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders billing tiers from /api/billing/tiers', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const text = await page.locator('body').innerText()
    expect(text.toLowerCase()).toMatch(/free|pro|team|business|enterprise|month|year/)
  })

  test('GET /api/billing/tiers returns the configured plans', async ({ page }) => {
    await signup(page, uniqueEmail('pricing-tiers'))
    const res = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: authHeaders(page),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { tiers?: unknown[]; data?: unknown[] } | unknown[]
    const tiers = Array.isArray(body) ? body : (body.data ?? body.tiers ?? [])
    expect(Array.isArray(tiers)).toBe(true)
    expect((tiers as unknown[]).length).toBeGreaterThan(0)
  })

  test('GET /api/billing/status reports the current plan', async ({ page }) => {
    await signup(page, uniqueEmail('pricing-status'))
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: authHeaders(page),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { planKey?: string; plan_key?: string }
    expect(body.planKey ?? body.plan_key, 'billing status must report a plan').toBeTruthy()
  })
})
