/**
 * Playlists CRUD — INVENTORY user flow #3 (create + share playlist) and
 * #4 (liked-songs / "add to playlist"). The same handler powers both:
 * "Liked Songs" is implemented as a special playlist on the client; the
 * server surface is uniform.
 *
 * G22: validation case (missing required `name`) + authz case (user B
 * cannot mutate user A's private playlist).
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiSignup } from './_shared/auth.js'

import { seedArtistTree } from './fixtures/seed.js'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

test('happy path: create playlist, add tracks, list, delete', async ({ request }) => {
  const { authHeaders } = await apiSignup(request, {
    email: `e2e-${Date.now()}-p1@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const { tracks } = await seedArtistTree()

  const create = await request.post(`${API_URL}/api/playlists`, {
    headers: authHeaders,
    data: { name: 'My Mix', description: 'E2E playlist', is_public: true },
    failOnStatusCode: false,
  })
  expect(create.status()).toBe(201)
  const playlist = (await create.json()) as { id: string; name: string }
  expect(playlist.name).toBe('My Mix')

  for (const track of tracks.slice(0, 2)) {
    const add = await request.post(`${API_URL}/api/playlists/${playlist.id}/tracks`, {
      headers: authHeaders,
      data: { track_id: track.id },
      failOnStatusCode: false,
    })
    expect(add.status()).toBe(201)
  }

  const list = await request.get(`${API_URL}/api/playlists`, {
    headers: authHeaders,
    failOnStatusCode: false,
  })
  expect(list.ok()).toBe(true)
  const items = (await list.json()) as Array<{ id: string; track_count: number }>
  const found = items.find((p) => p.id === playlist.id)
  expect(found).toBeTruthy()
  expect(found?.track_count).toBe(2)

  const del = await request.delete(`${API_URL}/api/playlists/${playlist.id}`, {
    headers: authHeaders,
    failOnStatusCode: false,
  })
  expect(del.status()).toBe(204)
})

test('validation failure: creating playlist without `name` is rejected (400)', async ({
  request,
}) => {
  const { authHeaders } = await apiSignup(request, {
    email: `e2e-${Date.now()}-pv@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const res = await request.post(`${API_URL}/api/playlists`, {
    headers: authHeaders,
    data: { description: 'no name' },
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(400)
})

test("authorization failure: another user cannot delete or mutate someone else's playlist", async ({
  request,
  browser,
}) => {
  const a = await apiSignup(request, {
    email: `e2e-${Date.now()}-pa-A@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const create = await request.post(`${API_URL}/api/playlists`, {
    headers: a.authHeaders,
    data: { name: 'Private Mix', is_public: false },
    failOnStatusCode: false,
  })
  expect(create.status()).toBe(201)
  const { id } = (await create.json()) as { id: string }

  const ctxB = await browser.newContext()
  const b = await apiSignup(ctxB.request, {
    email: `e2e-${Date.now()}-pa-B@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })

  // Non-owner reading a private playlist — 404 (don't reveal existence).
  const get = await ctxB.request.get(`${API_URL}/api/playlists/${id}`, {
    headers: b.authHeaders,
    failOnStatusCode: false,
  })
  expect([403, 404]).toContain(get.status())

  // Non-owner deletion — 403 / 404.
  const del = await ctxB.request.delete(`${API_URL}/api/playlists/${id}`, {
    headers: b.authHeaders,
    failOnStatusCode: false,
  })
  expect([403, 404]).toContain(del.status())
  await ctxB.close()
})
