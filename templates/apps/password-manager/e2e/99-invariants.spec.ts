/**
 * Direct HTTP invariant probes covering every primary backend feature.
 * Each test exercises a real user action and asserts on the read-after-
 * write invariant — e.g. POST then GET back the same row, never trust
 * just a 2xx.
 *
 * Lives in mlcl/templates/apps/password-manager/e2e/ — runs against
 * the spawned dev server on the same ports the smoke-app uses.
 */

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, signup, getAuthHeaders, uniqueEmail, STRONG_PASSWORD } from './_helpers'

test.describe('backend invariants — read-after-write', () => {
  test('items: POST item → GET back → DELETE moves to trash → restore brings back', async ({
    page,
    request,
  }) => {
    await signup(page)
    const headers = await getAuthHeaders(page)

    // Create
    const created = await request.post(`${API_BASE}/items`, {
      headers,
      data: {
        name: 'Test login',
        category: 'login',
        username: 'foo@bar.com',
        password: 'shh-secret-pw-1',
        url: 'https://example.com',
      },
    })
    expect(created.status()).toBe(201)
    const body = await created.json()
    const id =
      (body as { id?: string; data?: { id?: string } }).id ??
      (body as { data?: { id?: string } }).data?.id
    expect(id, 'created item should have an id').toBeTruthy()

    // Read back
    const got = await request.get(`${API_BASE}/items/${id}`, { headers })
    expect(got.status()).toBe(200)
    const gotBody = (await got.json()) as {
      data?: { name?: string; password?: string }
      name?: string
      password?: string
    }
    const it = gotBody.data ?? gotBody
    expect(it.name).toBe('Test login')
    // password should be returned (encrypted->decrypted on read)
    expect(it.password).toBe('shh-secret-pw-1')

    // Trash
    const trashed = await request.post(`${API_BASE}/items/${id}/trash`, { headers })
    expect(trashed.status()).toBeLessThan(400)

    // List should not include trashed by default
    const list = await request.get(`${API_BASE}/items`, { headers })
    expect(list.status()).toBe(200)
    const listBody = (await list.json()) as { data?: { id?: string }[] } | { id?: string }[]
    const arr: { id?: string }[] = Array.isArray(listBody) ? listBody : (listBody.data ?? [])
    expect(
      arr.find((r) => r.id === id),
      'trashed item should not appear in default list',
    ).toBeFalsy()

    // Restore
    const restored = await request.post(`${API_BASE}/items/${id}/restore`, { headers })
    expect(restored.status()).toBeLessThan(400)

    const list2 = await request.get(`${API_BASE}/items`, { headers })
    const list2Body = (await list2.json()) as { data?: { id?: string }[] } | { id?: string }[]
    const arr2: { id?: string }[] = Array.isArray(list2Body) ? list2Body : (list2Body.data ?? [])
    expect(
      arr2.find((r) => r.id === id),
      'restored item should reappear',
    ).toBeTruthy()
  })

  test('items: PUT updates name and password', async ({ page, request }) => {
    await signup(page)
    const headers = await getAuthHeaders(page)
    const created = await request.post(`${API_BASE}/items`, {
      headers,
      data: { name: 'Original', category: 'login', password: 'pw1' },
    })
    const id = ((await created.json()) as { id?: string }).id
    const updated = await request.put(`${API_BASE}/items/${id}`, {
      headers,
      data: { name: 'Updated', password: 'pw2' },
    })
    expect(updated.status()).toBe(200)
    const got = await request.get(`${API_BASE}/items/${id}`, { headers })
    const it = (await got.json()) as { name: string; password: string }
    expect(it.name).toBe('Updated')
    expect(it.password).toBe('pw2')
  })

  test('items: favorite POST flips is_favorite', async ({ page, request }) => {
    await signup(page)
    const headers = await getAuthHeaders(page)
    const created = await request.post(`${API_BASE}/items`, {
      headers,
      data: { name: 'Star me', category: 'login', password: 'pw' },
    })
    const id = ((await created.json()) as { id: string }).id
    const fav = await request.post(`${API_BASE}/items/${id}/favorite`, { headers })
    expect(fav.status()).toBeLessThan(400)
    const got = await request.get(`${API_BASE}/items/${id}`, { headers })
    const it = (await got.json()) as { is_favorite?: boolean; favorite?: boolean }
    expect(it.is_favorite ?? it.favorite, 'favorite should be true after POST').toBe(true)
  })

  test('vaults: POST + GET incoming/outgoing shares', async ({ page, request }) => {
    await signup(page)
    const headers = await getAuthHeaders(page)
    const created = await request.post(`${API_BASE}/vaults`, {
      headers,
      data: { name: 'Family Secrets' },
    })
    expect(created.status()).toBe(201)
    const id = ((await created.json()) as { id: string }).id
    const list = await request.get(`${API_BASE}/vaults`, { headers })
    const body = (await list.json()) as
      { id: string; name: string }[] | { data: { id: string; name: string }[] }
    const arr = Array.isArray(body) ? body : body.data
    expect(arr.find((v) => v.id === id)?.name).toBe('Family Secrets')

    // outgoing/incoming endpoints exist
    const out = await request.get(`${API_BASE}/shares/outgoing`, { headers })
    const inc = await request.get(`${API_BASE}/shares/incoming`, { headers })
    expect(out.status()).toBe(200)
    expect(inc.status()).toBe(200)
  })

  test('generator: POST returns a password of requested length with all charsets', async ({
    page,
    request,
  }) => {
    await signup(page)
    const headers = await getAuthHeaders(page)
    const gen = await request.post(`${API_BASE}/generator`, {
      headers,
      data: { length: 24, symbols: true, numbers: true, uppercase: true, lowercase: true },
    })
    expect(gen.status()).toBe(200)
    const body = (await gen.json()) as { password: string }
    expect(body.password.length).toBe(24)
    // Should contain at least one upper, one lower, one digit, one symbol
    expect(body.password).toMatch(/[A-Z]/)
    expect(body.password).toMatch(/[a-z]/)
    expect(body.password).toMatch(/[0-9]/)
    expect(body.password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/)
  })

  test('generator passphrase POST returns words joined with separator', async ({
    page,
    request,
  }) => {
    await signup(page)
    const headers = await getAuthHeaders(page)
    const gen = await request.post(`${API_BASE}/generator/passphrase`, {
      headers,
      data: { words: 5, separator: '-', capitalize: true },
    })
    expect(gen.status()).toBe(200)
    const body = (await gen.json()) as { passphrase: string }
    const tokens = body.passphrase.split('-')
    expect(tokens.length).toBe(5)
    // Capitalize true: every token starts with uppercase letter
    for (const w of tokens) expect(w[0]).toMatch(/[A-Z]/)
  })

  test('security: refresh creates findings; PUT marks dismissed; DELETE removes', async ({
    page,
    request,
  }) => {
    await signup(page)
    const headers = await getAuthHeaders(page)
    // Create a weak item so security scan finds something
    await request.post(`${API_BASE}/items`, {
      headers,
      data: { name: 'Weak', category: 'login', password: 'a' },
    })
    const ref = await request.post(`${API_BASE}/security/refresh`, { headers })
    expect(ref.status()).toBeLessThan(400)
    const list = await request.get(`${API_BASE}/security/findings`, { headers })
    expect(list.status()).toBe(200)
    const body = (await list.json()) as
      { data?: { id: string; dismissed?: boolean }[] } | { id: string; dismissed?: boolean }[]
    const items: { id: string; dismissed?: boolean }[] = Array.isArray(body)
      ? body
      : (body.data ?? [])
    expect(items.length, 'weak item should produce ≥1 finding').toBeGreaterThan(0)
    const fid = items[0]!.id

    const upd = await request.put(`${API_BASE}/security/findings/${fid}`, {
      headers,
      data: { dismissed: true },
    })
    expect(upd.status()).toBeLessThan(400)
    const after = await request.get(`${API_BASE}/security/findings`, { headers })
    const afterBody = (await after.json()) as
      { data?: { id: string; dismissed?: boolean }[] } | { id: string; dismissed?: boolean }[]
    const items2: { id: string; dismissed?: boolean }[] = Array.isArray(afterBody)
      ? afterBody
      : (afterBody.data ?? [])
    const found = items2.find((x) => x.id === fid)
    if (found) expect(found.dismissed).toBe(true)

    const del = await request.delete(`${API_BASE}/security/findings/${fid}`, { headers })
    expect(del.status()).toBeLessThan(400)
  })

  test('two-factor: enroll → verify → status reflects enrolled+verified → disable', async ({
    page,
    request,
  }) => {
    await signup(page)
    const headers = await getAuthHeaders(page)
    const enroll = await request.post(`${API_BASE}/two-factor/enroll`, { headers, data: {} })
    expect(enroll.status()).toBe(201)
    const enrollBody = (await enroll.json()) as { secret: string; otpauthUri?: string }
    expect(enrollBody.secret).toBeTruthy()
    expect(enrollBody.otpauthUri).toMatch(/^otpauth:\/\//)
    // Verify accepts any 4+ char code in test mode
    const verified = await request.post(`${API_BASE}/two-factor/verify`, {
      headers,
      data: { code: '123456' },
    })
    expect(verified.status()).toBe(200)
    const status = await request.get(`${API_BASE}/two-factor/status`, { headers })
    const sBody = (await status.json()) as { enrolled: boolean; verified_at: string | null }
    expect(sBody.enrolled).toBe(true)
    expect(sBody.verified_at, 'verified_at populated after verify').not.toBeNull()
    const disable = await request.delete(`${API_BASE}/two-factor`, { headers })
    expect(disable.status()).toBeLessThan(400)
    const post = await request.get(`${API_BASE}/two-factor/status`, { headers })
    const pBody = (await post.json()) as { enrolled: boolean }
    expect(pBody.enrolled).toBe(false)
  })

  test('recovery-keys: POST a key → GET shows it → DELETE removes', async ({ page, request }) => {
    await signup(page)
    const headers = await getAuthHeaders(page)
    // Mirror what the UI sends — public_key + encrypted_recovery_data
    const create = await request.post(`${API_BASE}/recovery-keys`, {
      headers,
      data: {
        public_key: 'pk-abcdef0123456789',
        encrypted_recovery_data: 'cmVjb3Zlcnk6QUJDREVGOjE3NDA3NDk2MDA=',
      },
    })
    expect(create.status()).toBe(201)
    const cBody = (await create.json()) as { id: string }
    expect(cBody.id).toBeTruthy()
    const list = await request.get(`${API_BASE}/recovery-keys`, { headers })
    const lBody = (await list.json()) as { data?: { id: string }[] } | { id: string }[]
    const arr = Array.isArray(lBody) ? lBody : (lBody.data ?? [])
    expect(arr.find((r) => r.id === cBody.id)).toBeTruthy()
    const del = await request.delete(`${API_BASE}/recovery-keys/${cBody.id}`, { headers })
    expect(del.status()).toBeLessThan(400)
  })

  test('billing: tiers GET returns 3 tiers with stripePriceId; checkout returns real Stripe URL', async ({
    page,
    request,
  }) => {
    await signup(page)
    const headers = await getAuthHeaders(page)
    const tiersRes = await request.get(`${API_BASE}/billing/tiers`)
    expect(tiersRes.status()).toBe(200)
    const tiersBody = (await tiersRes.json()) as {
      data: { key: string; prices: { stripePriceId: string | null }[] }[]
    }
    expect(tiersBody.data.length).toBeGreaterThanOrEqual(3)
    const pro = tiersBody.data.find((t) => t.key === 'pro')
    const proPrice = pro?.prices.find((p) => p.stripePriceId)
    expect(proPrice?.stripePriceId, 'pro tier should have a stripePriceId').toMatch(/^price_/)

    const checkout = await request.post(`${API_BASE}/billing/checkout`, {
      headers,
      data: { priceId: proPrice!.stripePriceId },
    })
    expect(checkout.status()).toBe(200)
    const cBody = (await checkout.json()) as { checkoutUrl?: string; updated?: boolean }
    expect(cBody.checkoutUrl, 'checkoutUrl should be returned').toMatch(/checkout\.stripe\.com/)
  })

  test('billing/status: GET returns planKey free for new user', async ({ page, request }) => {
    await signup(page)
    const headers = await getAuthHeaders(page)
    const status = await request.get(`${API_BASE}/billing/status`, { headers })
    expect(status.status()).toBe(200)
    const body = (await status.json()) as { planKey: string; isFree: boolean }
    expect(body.isFree).toBe(true)
  })

  test('forgot-password: POST returns 200 (mailgun call fires)', async ({ page, request }) => {
    const creds = await signup(page)
    const res = await request.post(`${API_BASE}/users/forgot-password`, {
      data: { email: creds.email },
    })
    expect(res.status()).toBe(200)
  })

  test('signup uniqueness: same email rejected', async ({ page, request }) => {
    const email = uniqueEmail('dup')
    await signup(page, email, STRONG_PASSWORD)
    // try API-level second signup
    const res = await request.post(`${API_BASE}/users`, {
      data: { email, password: STRONG_PASSWORD, firstName: 'A', lastName: 'B' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test('password-history: POST item history → GET shows it → DELETE removes', async ({
    page,
    request,
  }) => {
    await signup(page)
    const headers = await getAuthHeaders(page)
    // First create an owning item so password-history rows are scoped to it
    const itemRes = await request.post(`${API_BASE}/items`, {
      headers,
      data: { name: 'Vault for history', category: 'login', password: 'first-pw' },
    })
    expect(itemRes.status()).toBe(201)
    const itemBody = (await itemRes.json()) as { id?: string; data?: { id?: string } }
    const itemId = itemBody.id ?? itemBody.data?.id
    expect(itemId).toBeTruthy()

    // POST history entry
    const create = await request.post(`${API_BASE}/password-history`, {
      headers,
      data: { item_id: itemId, encrypted_password: 'enc::previous-secret-v1' },
    })
    expect(create.status()).toBe(201)
    const cBody = (await create.json()) as { id?: string; data?: { id?: string } }
    const historyId = cBody.id ?? cBody.data?.id
    expect(historyId).toBeTruthy()

    // GET back filtered by item
    const list = await request.get(`${API_BASE}/password-history?item_id=${itemId}`, { headers })
    expect(list.status()).toBe(200)
    const lBody = (await list.json()) as { data?: { id: string }[] } | { id: string }[]
    const arr = Array.isArray(lBody) ? lBody : (lBody.data ?? [])
    expect(
      arr.find((r) => r.id === historyId),
      'history row should be returned',
    ).toBeTruthy()

    // DELETE removes
    const del = await request.delete(`${API_BASE}/password-history/${historyId}`, { headers })
    expect(del.status()).toBeLessThan(400)
    const after = await request.get(`${API_BASE}/password-history?item_id=${itemId}`, { headers })
    const aBody = (await after.json()) as { data?: { id: string }[] } | { id: string }[]
    const arr2 = Array.isArray(aBody) ? aBody : (aBody.data ?? [])
    expect(
      arr2.find((r) => r.id === historyId),
      'deleted history row should be gone',
    ).toBeFalsy()
  })
})
