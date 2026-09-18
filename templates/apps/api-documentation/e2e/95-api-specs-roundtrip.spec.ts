import { test, expect, request } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, signupAndGetToken } from './_helpers'

// /api/specs is a backend-only resource (OpenAPI spec uploads). The UI
// doesn't expose CRUD for it yet, but the route is mounted and returns
// per-user data. This API-only round-trip ensures the handler is alive
// and authenticated.

test.describe('/api/specs round-trip', () => {
  test('POST → GET list → GET by id → PUT → DELETE round-trips one spec', async ({ page }) => {
    const { token } = await signupAndGetToken(page)
    expect(token).toBeTruthy()
    const ctx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    try {
      const empty = await ctx.get(API_BASE + '/specs')
      expect(empty.status()).toBe(200)
      const created = await ctx.post(API_BASE + '/specs', {
        data: { title: 'Test Spec', version: '1.0.0', description: 'roundtrip' },
      })
      expect(created.status()).toBe(201)
      const createdBody = (await created.json()) as { id?: string }
      expect(createdBody.id, 'created spec must have an id').toBeTruthy()
      const id = createdBody.id!

      const list = await ctx.get(API_BASE + '/specs')
      expect(list.status()).toBe(200)
      const listBody = (await list.json()) as Array<{ id: string }>
      expect(
        listBody.some((r) => r.id === id),
        'list must include created spec',
      ).toBeTruthy()

      const fetched = await ctx.get(API_BASE + `/specs/${id}`)
      expect(fetched.status()).toBe(200)
      const updated = await ctx.put(API_BASE + `/specs/${id}`, {
        data: { description: 'updated' },
      })
      expect(updated.status()).toBe(200)
      const deleted = await ctx.delete(API_BASE + `/specs/${id}`)
      expect(deleted.status()).toBe(204)
    } finally {
      await ctx.dispose()
    }
  })
})
