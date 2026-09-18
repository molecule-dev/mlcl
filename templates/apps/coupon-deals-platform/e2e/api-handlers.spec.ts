import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, signup } from './_helpers.js'

/**
 * Backend handler smoke checks for endpoints that aren't drawn directly
 * by the React UI today but ARE part of the public API surface and must
 * keep working (admin / future-feature consumers).
 */

test.describe('API handler contracts', () => {
  test('GET /api/categories returns the seeded category list', async ({ page }) => {
    const user = await signup(page)
    const res = await page.request.get(`${API_BASE}/categories`, {
      headers: apiHeaders(user.accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{ id: string; name: string; active_deals: number }>
    expect(Array.isArray(body), '/api/categories returns an array').toBe(true)
    expect(body.length, 'at least one seeded category').toBeGreaterThan(0)
    expect(body[0]).toHaveProperty('name')
  })

  test('GET /api/categories/:id returns a single category', async ({ page }) => {
    const user = await signup(page)
    const list = await page.request.get(`${API_BASE}/categories`, {
      headers: apiHeaders(user.accessToken),
    })
    const arr = (await list.json()) as Array<{ id: string }>
    const detail = await page.request.get(`${API_BASE}/categories/${arr[0].id}`, {
      headers: apiHeaders(user.accessToken),
    })
    expect(detail.status()).toBe(200)
    const body = (await detail.json()) as { id: string }
    expect(body.id).toBe(arr[0].id)
  })

  test('GET /api/categories/:id/deals returns deals tagged with that category', async ({
    page,
  }) => {
    const user = await signup(page)
    const list = await page.request.get(`${API_BASE}/categories`, {
      headers: apiHeaders(user.accessToken),
    })
    const cats = (await list.json()) as Array<{ id: string; active_deals: number }>
    const populated = cats.find((c) => c.active_deals > 0) ?? cats[0]
    const deals = await page.request.get(`${API_BASE}/categories/${populated.id}/deals`, {
      headers: apiHeaders(user.accessToken),
    })
    expect(deals.status()).toBe(200)
    expect(Array.isArray(await deals.json()), 'returns an array').toBe(true)
  })

  test('GET /api/billing/tiers returns at least Free + one paid tier', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/billing/tiers`)
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { data?: Array<{ key: string }> } | Array<{ key: string }>
    const list = Array.isArray(body) ? body : (body.data ?? [])
    expect(list.length, 'at least 2 tiers').toBeGreaterThanOrEqual(2)
    expect(
      list.some((t) => t.key === 'free'),
      'free tier present',
    ).toBe(true)
  })
})
