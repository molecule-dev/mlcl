import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authHeaders, API_BASE, signup } from './_helpers.js'

test.describe('crm: billing & tiers', () => {
  test('public /api/billing/tiers exposes free / pro / team plans with limits', async ({
    page,
  }) => {
    const res = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      data: Array<{ key: string; name: string; limits: Record<string, unknown> }>
    }
    const keys = body.data.map((t) => t.key).sort()
    expect(keys).toEqual(expect.arrayContaining(['free', 'pro', 'team']))
    const free = body.data.find((t) => t.key === 'free')!
    expect(free.limits.maxContacts).toBeDefined()
    expect(free.limits.maxDeals).toBeDefined()
  })

  test("authed /api/billing/status returns the current user's plan", async ({ page }) => {
    const session = await signup(page)
    const res = await page.request.get(`${API_BASE}/billing/status`, {
      headers: authHeaders(session.accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      planKey: string
      isFree: boolean
      limits: { maxContacts: number }
    }
    expect(body.planKey).toBe('free')
    expect(body.isFree).toBe(true)
    expect(body.limits.maxContacts).toBeGreaterThan(0)
  })

  test('payments table exists (regression: was missing in 0010 migration)', async ({ page }) => {
    // Indirectly assert: cancel-without-paid-plan returns 4xx, NOT 500 from a
    // missing relation. Before the 0011 migration added the payments table,
    // this code path threw "relation 'payments' does not exist" as a 500.
    const session = await signup(page)
    const res = await page.request.post(`${API_BASE}/billing/cancel`, {
      headers: authHeaders(session.accessToken),
    })
    expect(res.status()).toBeLessThan(500)
  })

  test('public pricing page renders without an authed user', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })
})
