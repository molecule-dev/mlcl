/**
 * /api/accounts — chart-of-accounts CRUD. Backend-only resource (no
 * dedicated UI page in this app), but consumed by reports + reconciliation.
 * These specs exercise the handler directly via page.request.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, signup, seedAccount } from './_helpers.js'

test.describe('chart of accounts (POST/GET/PUT/DELETE /api/accounts)', () => {
  test('GET /api/accounts returns an array for fresh user', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/accounts`, { headers: apiHeaders(accessToken) })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('POST /api/accounts creates and returns the row with id + serialized fields', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const code = `${1000 + Math.floor(Math.random() * 9000)}`
    const res = await page.request.post(`${API_BASE}/accounts`, {
      headers: apiHeaders(accessToken),
      data: { code, name: `Cash ${code}`, type: 'asset' },
      failOnStatusCode: false,
    })
    expect(res.status(), await res.text()).toBe(201)
    const body = (await res.json()) as { id: string; code: string; type: string }
    expect(body.id).toBeTruthy()
    expect(body.code).toBe(code)
    expect(body.type).toBe('asset')
  })

  test('seeded account appears in the list and survives reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    const a = await seedAccount(page, accessToken, { type: 'liability' })
    const list = await page.request.get(`${API_BASE}/accounts`, {
      headers: apiHeaders(accessToken),
    })
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as Array<{ id: string; code: string }>
    expect(rows.some((r) => r.id === a.id && r.code === a.code)).toBe(true)
  })

  test('PUT /api/accounts/:id updates the row', async ({ page }) => {
    const { accessToken } = await signup(page)
    const a = await seedAccount(page, accessToken, { name: 'Original' })
    const upd = await page.request.put(`${API_BASE}/accounts/${a.id}`, {
      headers: apiHeaders(accessToken),
      data: { name: 'Renamed' },
      failOnStatusCode: false,
    })
    expect(upd.status(), await upd.text()).toBe(200)
    const fresh = await page.request.get(`${API_BASE}/accounts/${a.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await fresh.json()) as { name: string }
    expect(body.name).toBe('Renamed')
  })

  test('DELETE /api/accounts/:id removes the row', async ({ page }) => {
    const { accessToken } = await signup(page)
    const a = await seedAccount(page, accessToken)
    const del = await page.request.delete(`${API_BASE}/accounts/${a.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect([200, 204]).toContain(del.status())
    const after = await page.request.get(`${API_BASE}/accounts/${a.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(after.status()).toBe(404)
  })

  test('cross-tenant: account by user A is invisible to user B', async ({ browser }) => {
    const ctx1 = await browser.newContext()
    const p1 = await ctx1.newPage()
    const a = await signup(p1)
    const acc = await seedAccount(p1, a.accessToken, { name: 'TenantA-only' })

    const ctx2 = await browser.newContext()
    const p2 = await ctx2.newPage()
    const b = await signup(p2)
    const list = await p2.request.get(`${API_BASE}/accounts`, {
      headers: apiHeaders(b.accessToken),
    })
    const rows = (await list.json()) as Array<{ id: string }>
    expect(rows.some((r) => r.id === acc.id)).toBe(false)
    await ctx1.close()
    await ctx2.close()
  })
})
