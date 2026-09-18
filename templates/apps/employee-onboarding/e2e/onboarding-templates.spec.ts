/**
 * onboarding-templates CRUD coverage. The handler is a real backend
 * endpoint (POST/GET/PUT/DELETE under /api/onboarding-templates) used
 * for HR-defined role templates an admin can clone into a fresh
 * employee's checklist. The current frontend doesn't expose a builder
 * UI for it, but the endpoint is part of the supported API surface
 * — tier-aware, scoped per-user, and round-trips state correctly.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('onboarding-templates', () => {
  test('GET /api/onboarding-templates returns an array (empty for fresh user)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('tpl-list'))
    const r = await page.request.get(`${API_BASE}/onboarding-templates`, {
      headers: authHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const data = (await r.json()) as unknown
    expect(Array.isArray(data)).toBe(true)
  })

  test('POST then GET round-trips a template; PUT updates it; DELETE removes it', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('tpl-crud'))
    const created = await page.request.post(`${API_BASE}/onboarding-templates`, {
      headers: authHeaders(accessToken),
      data: { name: 'Engineering 90-day', role_label: 'Engineer', default_duration_days: 90 },
    })
    expect(created.status()).toBe(201)
    const c = (await created.json()) as { id: string; name: string; default_duration_days: number }
    expect(c.id).toBeTruthy()
    expect(c.name).toBe('Engineering 90-day')

    const fetched = await page.request.get(`${API_BASE}/onboarding-templates/${c.id}`, {
      headers: authHeaders(accessToken),
    })
    expect(fetched.status()).toBe(200)
    const f = (await fetched.json()) as { name: string; default_duration_days: number }
    expect(f.name).toBe('Engineering 90-day')
    expect(f.default_duration_days).toBe(90)

    const updated = await page.request.put(`${API_BASE}/onboarding-templates/${c.id}`, {
      headers: authHeaders(accessToken),
      data: { name: 'Engineering 60-day', default_duration_days: 60 },
    })
    expect(updated.status()).toBe(200)
    const after = await page.request.get(`${API_BASE}/onboarding-templates/${c.id}`, {
      headers: authHeaders(accessToken),
    })
    const a = (await after.json()) as { name: string; default_duration_days: number }
    expect(a.name).toBe('Engineering 60-day')
    expect(a.default_duration_days).toBe(60)

    const deleted = await page.request.delete(`${API_BASE}/onboarding-templates/${c.id}`, {
      headers: authHeaders(accessToken),
    })
    expect([200, 204].includes(deleted.status())).toBe(true)
    const gone = await page.request.get(`${API_BASE}/onboarding-templates/${c.id}`, {
      headers: authHeaders(accessToken),
    })
    expect(gone.status()).toBe(404)
  })

  test('templates from one user are NOT visible to another user', async ({ browser }) => {
    const ctx1 = await browser.newContext()
    const page1 = await ctx1.newPage()
    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()
    try {
      const u1 = await signup(page1, uniqueEmail('tpl-iso-1'))
      await page1.request.post(`${API_BASE}/onboarding-templates`, {
        headers: authHeaders(u1.accessToken),
        data: { name: 'Private', role_label: 'X' },
      })
      const u2 = await signup(page2, uniqueEmail('tpl-iso-2'))
      const u2List = await page2.request.get(`${API_BASE}/onboarding-templates`, {
        headers: authHeaders(u2.accessToken),
      })
      const data = (await u2List.json()) as Array<{ name: string }>
      expect(data.find((d) => d.name === 'Private')).toBeUndefined()
    } finally {
      await ctx1.close()
      await ctx2.close()
    }
  })
})
