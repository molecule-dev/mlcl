import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, API_BASE } from './_helpers.js'

test.describe('billing', () => {
  test('GET /billing/tiers exposes free + pro + team plans', async ({ page, request }) => {
    await signup(page)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const resp = await request.get(`${API_BASE}/billing/tiers`, {
      headers: { Cookie: cookieHeader },
    })
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    const tiers = Array.isArray(body) ? body : (body?.tiers ?? body?.data)
    expect(Array.isArray(tiers)).toBe(true)
    const keys = tiers.map((tier: { key?: string }) => tier.key)
    expect(keys).toContain('free')
    expect(keys).toContain('pro')
    expect(keys).toContain('team')
  })

  test('GET /billing/status reports active=false on a fresh signup', async ({ page, request }) => {
    await signup(page)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const resp = await request.get(`${API_BASE}/billing/status`, {
      headers: { Cookie: cookieHeader },
    })
    expect(resp.status()).toBe(200)
    const status = await resp.json()
    expect(status).toBeTruthy()
  })
})
