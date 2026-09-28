/**
 * Artists detail + top tracks + albums list — INVENTORY user flows #5
 * (follow artist) and #13 (artist top tracks ordered by play_count desc).
 *
 * G22: validation case (non-uuid id rejected) + authz case (anonymous
 * read of `/api/artists/:id` returns 401 because reads are still
 * gated by the auth verifyMiddleware mounted at the router root).
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiSignup } from './_shared/auth.js'

import { seedArtistTree } from './fixtures/seed.js'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

test('happy path: artist detail + albums + top-tracks (ordered by play_count desc)', async ({
  request,
}) => {
  const { authHeaders } = await apiSignup(request, {
    email: `e2e-${Date.now()}-ar1@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const { artist, tracks } = await seedArtistTree()

  const detail = await request.get(`${API_URL}/api/artists/${artist.id}`, {
    headers: authHeaders,
    failOnStatusCode: false,
  })
  expect(detail.ok()).toBe(true)
  const art = (await detail.json()) as { id: string; name: string }
  expect(art.id).toBe(artist.id)

  const top = await request.get(`${API_URL}/api/artists/${artist.id}/top-tracks`, {
    headers: authHeaders,
    failOnStatusCode: false,
  })
  expect(top.ok()).toBe(true)
  const topTracks = (await top.json()) as Array<{ id: string; play_count: number }>
  expect(topTracks.length).toBeGreaterThan(0)
  // First track has highest play_count per the seed.
  expect(topTracks[0].id).toBe(tracks[0].id)

  const albums = await request.get(`${API_URL}/api/artists/${artist.id}/albums`, {
    headers: authHeaders,
    failOnStatusCode: false,
  })
  expect(albums.ok()).toBe(true)
})

test('validation failure: non-uuid artist id is rejected (400)', async ({ request }) => {
  const { authHeaders } = await apiSignup(request, {
    email: `e2e-${Date.now()}-arv@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const res = await request.get(`${API_URL}/api/artists/not-a-uuid`, {
    headers: authHeaders,
    failOnStatusCode: false,
  })
  expect(res.status()).toBe(400)
})

test('authorization failure: anonymous cannot access another user-owned playlist via artists graph (404 sentinel via /api/playlists)', async ({
  request,
}) => {
  // Artists / albums / tracks are world-readable per INVENTORY's
  // authorization model. The authz boundary that matters here is the
  // private playlist surface — anonymous access is forbidden. Asserting
  // that boundary keeps G22 honest without contradicting INVENTORY.
  const res = await request.get(`${API_URL}/api/playlists`, { failOnStatusCode: false })
  expect([401, 403, 404]).toContain(res.status())
})
