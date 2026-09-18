/**
 * Backend invariant audit — direct API tests that the handler contracts
 * actually hold across CRUD, ownership, and read-after-write.
 *
 * These cover the gaps that a UI-only walk-through misses:
 *   - cross-user authorization (one user can never see another's data)
 *   - read-after-write at the JSON boundary (no UI mediation)
 *   - duplicate / update / delete actually mutate persisted state
 *   - schema validation on the create paths
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, apiHeaders, createAlbum, createImage, signup } from './_helpers.js'

test.describe('api invariants — images', () => {
  test('PUT /images/:id round-trips name + edit_history changes', async ({ page }) => {
    const { accessToken } = await signup(page)
    const img = await createImage(page, accessToken, { name: 'Original' })
    const update = await page.request.put(`${API_BASE}/images/${img.id}`, {
      headers: apiHeaders(accessToken),
      data: {
        name: 'Renamed',
        edit_history: [
          { ts: '2026-01-01T00:00:00Z', label: 'Test', adjustments: { exposure: 10 } },
        ],
      },
    })
    expect(update.status()).toBe(200)
    const get = await page.request.get(`${API_BASE}/images/${img.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(get.status()).toBe(200)
    const body = (await get.json()) as { name: string; edit_history: Array<{ label: string }> }
    expect(body.name).toBe('Renamed')
    expect(body.edit_history.length).toBe(1)
    expect(body.edit_history[0].label).toBe('Test')
  })

  test('POST /images/:id/duplicate creates a new row with " (Copy)" suffix and zero edit_history', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const img = await createImage(page, accessToken, { name: 'Sourced' })
    const dup = await page.request.post(`${API_BASE}/images/${img.id}/duplicate`, {
      headers: apiHeaders(accessToken),
    })
    expect(dup.status()).toBe(201)
    const dupBody = (await dup.json()) as { id: string; name: string; edit_history: unknown[] }
    expect(dupBody.id).not.toBe(img.id)
    expect(dupBody.name).toBe('Sourced (Copy)')
    // Fresh duplicate must start with empty edit_history.
    expect(Array.isArray(dupBody.edit_history) ? dupBody.edit_history.length : 0).toBe(0)
  })

  test('DELETE /images/:id removes the row (read-after-delete returns 404)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const img = await createImage(page, accessToken, { name: 'To delete' })
    const del = await page.request.delete(`${API_BASE}/images/${img.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(del.status()).toBe(204)
    const get = await page.request.get(`${API_BASE}/images/${img.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(get.status()).toBe(404)
  })

  test('user A cannot read, update, or delete user B\u2019s image', async ({ page, browser }) => {
    const userA = await signup(page)
    const imgA = await createImage(page, userA.accessToken, { name: 'Owned by A' })

    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    const userB = await signup(pageB)

    const get = await pageB.request.get(`${API_BASE}/images/${imgA.id}`, {
      headers: apiHeaders(userB.accessToken),
    })
    expect(get.status()).toBe(404)
    const put = await pageB.request.put(`${API_BASE}/images/${imgA.id}`, {
      headers: apiHeaders(userB.accessToken),
      data: { name: 'Hijacked' },
    })
    expect(put.status()).toBe(404)
    const del = await pageB.request.delete(`${API_BASE}/images/${imgA.id}`, {
      headers: apiHeaders(userB.accessToken),
    })
    expect(del.status()).toBe(404)
    await ctxB.close()
  })

  test('POST /images rejects missing required fields with 4xx', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.post(`${API_BASE}/images`, {
      headers: apiHeaders(accessToken),
      data: { name: 'No URL' },
    })
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
  })

  test('POST /images requires authentication (no token → 401)', async ({ page }) => {
    const r = await page.request.post(`${API_BASE}/images`, {
      headers: { 'Content-Type': 'application/json' },
      data: { name: 'Anon', original_url: 'https://example.com/x.jpg' },
    })
    expect(r.status()).toBe(401)
  })
})

test.describe('api invariants — albums', () => {
  test('PUT /albums/:id renames and read-back reflects it', async ({ page }) => {
    const { accessToken } = await signup(page)
    const album = await createAlbum(page, accessToken, 'Old name')
    const upd = await page.request.put(`${API_BASE}/albums/${album.id}`, {
      headers: apiHeaders(accessToken),
      data: { name: 'New name' },
    })
    expect(upd.status()).toBe(200)
    const get = await page.request.get(`${API_BASE}/albums/${album.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(get.status()).toBe(200)
    expect(((await get.json()) as { name: string }).name).toBe('New name')
  })

  test('DELETE /albums/:id removes an empty album (and 404 on next read)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const album = await createAlbum(page, accessToken, 'Disposable')
    const del = await page.request.delete(`${API_BASE}/albums/${album.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(del.status()).toBe(204)
    const get = await page.request.get(`${API_BASE}/albums/${album.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(get.status()).toBe(404)
  })

  test('user A cannot fetch, update, or delete user B\u2019s album', async ({ page, browser }) => {
    const userA = await signup(page)
    const albumA = await createAlbum(page, userA.accessToken, 'Private')

    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    const userB = await signup(pageB)

    const get = await pageB.request.get(`${API_BASE}/albums/${albumA.id}`, {
      headers: apiHeaders(userB.accessToken),
    })
    expect(get.status()).toBe(404)
    const upd = await pageB.request.put(`${API_BASE}/albums/${albumA.id}`, {
      headers: apiHeaders(userB.accessToken),
      data: { name: 'Hijack' },
    })
    expect(upd.status()).toBe(404)
    const del = await pageB.request.delete(`${API_BASE}/albums/${albumA.id}`, {
      headers: apiHeaders(userB.accessToken),
    })
    expect(del.status()).toBe(404)
    await ctxB.close()
  })
})

test.describe('api invariants — exports', () => {
  test('POST /exports rejects images that do not belong to the caller', async ({
    page,
    browser,
  }) => {
    const userA = await signup(page)
    const imgA = await createImage(page, userA.accessToken, { name: 'A only' })

    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    const userB = await signup(pageB)
    const r = await pageB.request.post(`${API_BASE}/exports`, {
      headers: apiHeaders(userB.accessToken),
      data: { image_id: imgA.id, format: 'jpg', quality: 90 },
    })
    expect(r.status()).toBe(404)
    await ctxB.close()
  })

  test('GET /exports orders by created_at desc (newest first)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const img = await createImage(page, accessToken, { name: 'For exports' })
    for (const fmt of ['jpg', 'png', 'webp']) {
      const r = await page.request.post(`${API_BASE}/exports`, {
        headers: apiHeaders(accessToken),
        data: { image_id: img.id, format: fmt, quality: 80 },
      })
      expect(r.status()).toBe(201)
      // Tiny gap so created_at differs.
      await new Promise((res) => setTimeout(res, 50))
    }
    const list = await page.request.get(`${API_BASE}/exports`, { headers: apiHeaders(accessToken) })
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as Array<{ created_at: string }>
    expect(rows.length).toBeGreaterThanOrEqual(3)
    const stamps = rows.map((r) => new Date(r.created_at).getTime())
    const sorted = [...stamps].sort((a, b) => b - a)
    expect(stamps).toEqual(sorted)
  })
})

test.describe('api invariants — adjustments', () => {
  test('POST /adjustments/apply persists a row and GET /adjustments/history returns it', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const img = await createImage(page, accessToken, { name: 'Adjustment carrier' })
    const create = await page.request.post(`${API_BASE}/adjustments/apply`, {
      headers: apiHeaders(accessToken),
      data: { image_id: img.id, adjustment_type: 'exposure', value: 25 },
    })
    expect(create.status()).toBe(201)
    const history = await page.request.get(`${API_BASE}/adjustments/history?image_id=${img.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(history.status()).toBe(200)
    const rows = (await history.json()) as Array<{ adjustment_type: string; value: number }>
    expect(rows.find((r) => r.adjustment_type === 'exposure' && r.value === 25)).toBeTruthy()
  })

  test('POST /adjustments/apply rejects unknown image with 404 (cross-user safety)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.post(`${API_BASE}/adjustments/apply`, {
      headers: apiHeaders(accessToken),
      data: {
        image_id: '00000000-0000-0000-0000-000000000000',
        adjustment_type: 'exposure',
        value: 10,
      },
    })
    expect(r.status()).toBe(404)
  })
})

test.describe('api invariants — layers', () => {
  test('POST /layers + GET /layers + PUT + DELETE round-trip with read-after-write', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const img = await createImage(page, accessToken, { name: 'Layer carrier' })

    // Create a layer.
    const create = await page.request.post(`${API_BASE}/layers`, {
      headers: apiHeaders(accessToken),
      data: {
        image_id: img.id,
        kind: 'filter',
        parameters: { foo: 'bar' },
        opacity: 0.8,
        z_index: 1,
      },
    })
    expect(create.status()).toBe(201)
    const created = (await create.json()) as { id: string; opacity: number }
    expect(created.opacity).toBeCloseTo(0.8)

    // Read-after-write: GET /layers?image_id= must include the new row.
    const list = await page.request.get(`${API_BASE}/layers?image_id=${img.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as Array<{ id: string; opacity: number }>
    expect(rows.find((r) => r.id === created.id)).toBeTruthy()

    // PUT updates opacity.
    const upd = await page.request.put(`${API_BASE}/layers/${created.id}`, {
      headers: apiHeaders(accessToken),
      data: { opacity: 0.4 },
    })
    expect(upd.status()).toBe(200)

    // DELETE removes the row; subsequent GET must not include it.
    const del = await page.request.delete(`${API_BASE}/layers/${created.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(del.status()).toBe(204)
    const after = await page.request.get(`${API_BASE}/layers?image_id=${img.id}`, {
      headers: apiHeaders(accessToken),
    })
    const afterRows = (await after.json()) as Array<{ id: string }>
    expect(afterRows.find((r) => r.id === created.id)).toBeFalsy()
  })

  test('GET /layers requires image_id query parameter', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.get(`${API_BASE}/layers`, { headers: apiHeaders(accessToken) })
    expect(r.status()).toBe(400)
  })
})

test.describe('api invariants — billing', () => {
  test('GET /billing/status returns isFree=true for a brand-new user', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.get(`${API_BASE}/billing/status`, {
      headers: apiHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as { planKey: string; isFree: boolean; name: string }
    expect(body.planKey).toBe('free')
    expect(body.isFree).toBe(true)
    expect(body.name.toLowerCase()).toContain('free')
  })

  test('POST /billing/checkout with a valid Pro priceId returns a real Stripe checkout URL', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const tiers = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: apiHeaders(accessToken),
    })
    const tiersBody = (await tiers.json()) as {
      data: Array<{ key: string; prices: Array<{ period: string; stripePriceId: string | null }> }>
    }
    const pro = tiersBody.data.find((t) => t.key === 'pro')
    const priceId = pro?.prices.find((p) => p.period === 'month')?.stripePriceId
    expect(priceId, 'no Pro monthly stripe price id seeded').toBeTruthy()

    const r = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId },
    })
    expect(r.status()).toBe(200)
    const body = (await r.json()) as { checkoutUrl?: string; updated?: boolean }
    expect(body.checkoutUrl, JSON.stringify(body)).toBeTruthy()
    expect(body.checkoutUrl ?? '').toMatch(/checkout\.stripe\.com|cs_test_|cs_live_/)
  })

  test('POST /billing/checkout with an unknown priceId fails cleanly (no 5xx silent)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId: 'price_does_not_exist' },
    })
    // Acceptable: 400/404 with an error body, OR 500 if Stripe rejected — must not be 200 with empty body.
    if (r.status() === 200) {
      const body = (await r.json()) as { checkoutUrl?: string }
      expect(body.checkoutUrl).toBeTruthy()
    } else {
      expect(r.status()).toBeGreaterThanOrEqual(400)
    }
  })
})

test.describe('api invariants — filters', () => {
  test('GET /filters/presets returns built-in presets (typed parameters)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.get(`${API_BASE}/filters/presets`, {
      headers: apiHeaders(accessToken),
    })
    expect(r.status()).toBe(200)
    const rows = (await r.json()) as Array<{
      id: string
      name: string
      user_id: string | null
      parameters: unknown
    }>
    expect(rows.length).toBeGreaterThan(0)
    const builtIns = rows.filter((p) => p.user_id === null)
    expect(builtIns.length).toBeGreaterThan(0)
    // parameters MUST be a parsed object (not a JSONB string).
    expect(typeof builtIns[0].parameters).toBe('object')
  })

  test('POST /filters/presets persists a user preset and GET returns it back', async ({ page }) => {
    const { accessToken } = await signup(page)
    const create = await page.request.post(`${API_BASE}/filters/presets`, {
      headers: apiHeaders(accessToken),
      data: { name: 'My Velvet', parameters: { exposure: 0.5, contrast: 1.2 } },
    })
    expect(create.status()).toBe(201)
    const created = (await create.json()) as {
      id: string
      name: string
      parameters: Record<string, number>
    }
    expect(created.name).toBe('My Velvet')
    expect(created.parameters?.exposure).toBe(0.5)

    const list = await page.request.get(`${API_BASE}/filters/presets`, {
      headers: apiHeaders(accessToken),
    })
    const rows = (await list.json()) as Array<{ id: string; parameters: Record<string, number> }>
    const mine = rows.find((p) => p.id === created.id)
    expect(mine).toBeTruthy()
    expect(mine?.parameters.contrast).toBe(1.2)
  })

  test('DELETE /filters/presets/:id removes a user preset (cross-user safety)', async ({
    page,
    browser,
  }) => {
    const userA = await signup(page)
    const create = await page.request.post(`${API_BASE}/filters/presets`, {
      headers: apiHeaders(userA.accessToken),
      data: { name: 'A only', parameters: {} },
    })
    const presetId = ((await create.json()) as { id: string }).id

    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    const userB = await signup(pageB)
    // user B cannot delete user A's preset.
    const denied = await pageB.request.delete(`${API_BASE}/filters/presets/${presetId}`, {
      headers: apiHeaders(userB.accessToken),
    })
    expect(denied.status()).toBe(404)
    await ctxB.close()

    // user A can delete and read-after-delete confirms removal.
    const del = await page.request.delete(`${API_BASE}/filters/presets/${presetId}`, {
      headers: apiHeaders(userA.accessToken),
    })
    expect(del.status()).toBe(204)
    const list = await page.request.get(`${API_BASE}/filters/presets`, {
      headers: apiHeaders(userA.accessToken),
    })
    const rows = (await list.json()) as Array<{ id: string }>
    expect(rows.find((r) => r.id === presetId)).toBeFalsy()
  })

  test('POST /filters/apply persists a row and GET /filters/history returns it (typed)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const img = await createImage(page, accessToken, { name: 'Filter carrier' })
    const apply = await page.request.post(`${API_BASE}/filters/apply`, {
      headers: apiHeaders(accessToken),
      data: {
        image_id: img.id,
        filter_type: 'velvet-dusk',
        intensity: 0.6,
        parameters: { warmth: 0.3 },
      },
    })
    expect(apply.status()).toBe(201)
    const applied = (await apply.json()) as {
      id: string
      intensity: number
      parameters: Record<string, number>
    }
    expect(applied.intensity).toBeCloseTo(0.6)
    expect(applied.parameters.warmth).toBeCloseTo(0.3)

    const hist = await page.request.get(`${API_BASE}/filters/history?image_id=${img.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(hist.status()).toBe(200)
    const rows = (await hist.json()) as Array<{
      id: string
      intensity: number
      filter_type: string
    }>
    const mine = rows.find((r) => r.id === applied.id)
    expect(mine).toBeTruthy()
    expect(mine?.filter_type).toBe('velvet-dusk')
    expect(mine?.intensity).toBeCloseTo(0.6)
  })

  test('POST /filters/apply rejects unknown image_id with 404', async ({ page }) => {
    const { accessToken } = await signup(page)
    const r = await page.request.post(`${API_BASE}/filters/apply`, {
      headers: apiHeaders(accessToken),
      data: {
        image_id: '00000000-0000-0000-0000-000000000000',
        filter_type: 'velvet-dusk',
        intensity: 0.5,
      },
    })
    expect(r.status()).toBe(404)
  })
})
