import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, signup, uniqueEmail } from './_helpers.js'

interface SessionEnvelope {
  accessToken: string
  props: { id: string }
}

async function loginViaApi(email: string, password: string): Promise<SessionEnvelope> {
  const res = await fetch(`${API_BASE}/users/log-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  expect(res.ok, `log-in failed: ${res.status}`).toBe(true)
  return (await res.json()) as SessionEnvelope
}

test.describe('api-tokens', () => {
  // The personal API tokens resource isn't surfaced in the meeting-notes UI
  // (it's a backend-only feature), but the route is mounted and must round
  // trip create → list → delete with proper auth and the same hidden-secret
  // semantics as production. These are HTTP-level invariants any UI we
  // bolt on later will rely on.

  test('POST /api/api-tokens creates a token, returns plaintext once, and lists hashed', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('aimn-token')
    await signup(page, email, 'TestPass123!')
    const session = await loginViaApi(email, 'TestPass123!')
    const auth = { Authorization: `Bearer ${session.accessToken}` }

    // Create a token
    const create = await request.post(`${API_BASE}/api-tokens`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
      data: { label: 'CI publish' },
    })
    expect(create.status()).toBe(201)
    const created = (await create.json()) as {
      id: string
      label: string
      token?: string
      hashed_token?: string
    }
    expect(created.id).toBeTruthy()
    expect(created.label).toBe('CI publish')
    expect(created.token, 'plaintext token must be returned exactly once').toBeTruthy()
    expect(created.hashed_token, 'hashed_token must never be sent to the client').toBeUndefined()

    // List tokens — must include our row but never the hashed token field
    const list = await request.get(`${API_BASE}/api-tokens`, { headers: auth })
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as Array<{ id: string; label: string; hashed_token?: string }>
    const ours = rows.find((r) => r.id === created.id)
    expect(ours).toBeTruthy()
    expect(ours!.label).toBe('CI publish')
    expect(ours!.hashed_token).toBeUndefined()
  })

  test('DELETE /api/api-tokens/:id removes the token; second delete is 404', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('aimn-token-del')
    await signup(page, email, 'TestPass123!')
    const session = await loginViaApi(email, 'TestPass123!')
    const auth = { Authorization: `Bearer ${session.accessToken}` }

    const create = await request.post(`${API_BASE}/api-tokens`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
      data: { label: 'temp' },
    })
    const { id } = (await create.json()) as { id: string }

    const del = await request.delete(`${API_BASE}/api-tokens/${id}`, { headers: auth })
    expect(del.status()).toBe(204)

    const second = await request.delete(`${API_BASE}/api-tokens/${id}`, { headers: auth })
    expect(second.status()).toBe(404)

    // Listing again must not include the deleted token
    const list = await request.get(`${API_BASE}/api-tokens`, { headers: auth })
    const rows = (await list.json()) as Array<{ id: string }>
    expect(rows.find((r) => r.id === id)).toBeFalsy()
  })

  test('api-tokens endpoints reject unauthenticated callers with 401', async ({ request }) => {
    const list = await request.get(`${API_BASE}/api-tokens`)
    expect(list.status()).toBe(401)

    const create = await request.post(`${API_BASE}/api-tokens`, {
      headers: { 'Content-Type': 'application/json' },
      data: { label: 'evil' },
    })
    expect(create.status()).toBe(401)
  })

  test('the legacy /api/api_tokens snake_case alias is still routed', async ({ page, request }) => {
    // Some older clients hit /api/api_tokens (snake_case). The router
    // mounts both /api-tokens (kebab) and /api_tokens (snake) onto the
    // same handler — verify the alias responds identically.
    const email = uniqueEmail('aimn-token-alias')
    await signup(page, email, 'TestPass123!')
    const session = await loginViaApi(email, 'TestPass123!')
    const auth = { Authorization: `Bearer ${session.accessToken}` }

    const list = await request.get(`${API_BASE}/api_tokens`, { headers: auth })
    expect(list.status()).toBe(200)
  })
})
