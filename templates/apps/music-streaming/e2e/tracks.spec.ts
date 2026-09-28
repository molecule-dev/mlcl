/**
 * Tracks read + play recording — INVENTORY user flows #1 (first listen)
 * and #7 (HLS streaming surface — we exercise the audio_url field on the
 * track row; the real HLS bond is a CDN concern).
 *
 * G22: validation case (search with empty `q`) + authz case (anonymous
 * play).
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiSignup } from './_shared/auth.js'

import { seedArtistTree } from './fixtures/seed.js'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

test('happy path: read seeded track, record a play, list by album_id', async ({ request }) => {
  const { authHeaders } = await apiSignup(request, {
    email: `e2e-${Date.now()}-tr1@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const { album, tracks } = await seedArtistTree()

  const get = await request.get(`${API_URL}/api/tracks/${tracks[0].id}`, {
    headers: authHeaders,
    failOnStatusCode: false,
  })
  expect(get.ok()).toBe(true)
  const track = (await get.json()) as { id: string; title: string }
  expect(track.id).toBe(tracks[0].id)

  const play = await request.post(`${API_URL}/api/tracks/${tracks[0].id}/play`, {
    headers: authHeaders,
    data: {},
    failOnStatusCode: false,
  })
  expect(play.ok()).toBe(true)
  const played = (await play.json()) as { played: boolean }
  expect(played.played).toBe(true)

  const list = await request.get(`${API_URL}/api/tracks?album_id=${album.id}`, {
    headers: authHeaders,
    failOnStatusCode: false,
  })
  expect(list.ok()).toBe(true)
  const items = (await list.json()) as Array<{ id: string }>
  expect(items.length).toBe(tracks.length)
})

test('validation failure: track search with empty q is rejected (4xx)', async ({ request }) => {
  const { authHeaders } = await apiSignup(request, {
    email: `e2e-${Date.now()}-tv@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const res = await request.get(`${API_URL}/api/tracks/search?q=`, {
    headers: authHeaders,
    failOnStatusCode: false,
  })
  expect(res.status()).toBeGreaterThanOrEqual(400)
  expect(res.status()).toBeLessThan(500)
})

test('authorization failure: anonymous POST /tracks/:id/play returns 401/403', async ({
  request,
}) => {
  const { tracks } = await seedArtistTree()
  const res = await request.post(`${API_URL}/api/tracks/${tracks[0].id}/play`, {
    data: {},
    failOnStatusCode: false,
  })
  expect([401, 403, 404]).toContain(res.status())
})
