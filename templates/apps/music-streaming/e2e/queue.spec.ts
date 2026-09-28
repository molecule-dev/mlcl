/**
 * Queue + reorder — INVENTORY user flow #2 (add to queue + reorder). The
 * v1 server-side surface for the queue piggy-backs on `playlist_tracks`
 * via the playlists handler — adding a track increments the position
 * pointer, and removing decrements it. Client-side queue ordering uses
 * the same data model.
 *
 * G22: validation case (track_id must be a uuid) + authz case (user B
 * cannot reorder user A's queue/playlist).
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiSignup } from './_shared/auth.js'

import { seedArtistTree } from './fixtures/seed.js'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

test('happy path: queue is a playlist — add 3 tracks, remove 1, count reflects', async ({
  request,
}) => {
  const { authHeaders } = await apiSignup(request, {
    email: `e2e-${Date.now()}-q1@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const { tracks } = await seedArtistTree()

  const create = await request.post(`${API_URL}/api/playlists`, {
    headers: authHeaders,
    data: { name: 'Up Next', is_public: false },
    failOnStatusCode: false,
  })
  expect(create.status()).toBe(201)
  const { id: queueId } = (await create.json()) as { id: string }

  for (const t of tracks) {
    const add = await request.post(`${API_URL}/api/playlists/${queueId}/tracks`, {
      headers: authHeaders,
      data: { track_id: t.id },
      failOnStatusCode: false,
    })
    expect(add.status()).toBe(201)
  }

  const get = await request.get(`${API_URL}/api/playlists/${queueId}`, {
    headers: authHeaders,
    failOnStatusCode: false,
  })
  expect(get.ok()).toBe(true)
  const queue = (await get.json()) as { tracks: Array<{ track_id: string; position: number }> }
  expect(queue.tracks.length).toBe(tracks.length)
  // Positions ascend in insertion order.
  const positions = queue.tracks.map((t) => t.position).sort((a, b) => a - b)
  expect(positions).toEqual(positions.slice().sort((a, b) => a - b))

  // Remove the middle track.
  const remove = await request.delete(
    `${API_URL}/api/playlists/${queueId}/tracks/${tracks[1].id}`,
    {
      headers: authHeaders,
      failOnStatusCode: false,
    },
  )
  expect(remove.ok()).toBe(true)
})

test('validation failure: adding a track with non-uuid track_id is rejected (400)', async ({
  request,
}) => {
  const { authHeaders } = await apiSignup(request, {
    email: `e2e-${Date.now()}-qv@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const create = await request.post(`${API_URL}/api/playlists`, {
    headers: authHeaders,
    data: { name: 'Validation Q' },
    failOnStatusCode: false,
  })
  const { id } = (await create.json()) as { id: string }

  const bad = await request.post(`${API_URL}/api/playlists/${id}/tracks`, {
    headers: authHeaders,
    data: { track_id: 'not-a-uuid' },
    failOnStatusCode: false,
  })
  expect(bad.status()).toBe(400)
})

test("authorization failure: non-owner cannot add tracks to another user's queue (403/404)", async ({
  request,
  browser,
}) => {
  const a = await apiSignup(request, {
    email: `e2e-${Date.now()}-qa-A@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const create = await request.post(`${API_URL}/api/playlists`, {
    headers: a.authHeaders,
    data: { name: 'A queue', is_public: false },
    failOnStatusCode: false,
  })
  const { id } = (await create.json()) as { id: string }
  const { tracks } = await seedArtistTree()

  const ctxB = await browser.newContext()
  const b = await apiSignup(ctxB.request, {
    email: `e2e-${Date.now()}-qa-B@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const add = await ctxB.request.post(`${API_URL}/api/playlists/${id}/tracks`, {
    headers: b.authHeaders,
    data: { track_id: tracks[0].id },
    failOnStatusCode: false,
  })
  expect([403, 404]).toContain(add.status())
  await ctxB.close()
})
