/**
 * NowPlaying view + persistent player state — INVENTORY user flow #14
 * (NowPlaying full-screen view mirrors mini-player state). The state
 * itself is client-side (zustand store + howler.js audio bond), so
 * the server-side surface is just the play-recording endpoint and
 * the track read endpoint exercised here. Page-level mirroring is
 * a UI concern covered by the Playwright nav.
 *
 * G22: validation case (invalid track id) + authz case (anonymous play).
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiSignup, signupAndLogin } from './_shared/auth.js'

import { seedArtistTree } from './fixtures/seed.js'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'

test('happy path: signed-in user can navigate to /now-playing without redirect', async ({
  page,
}) => {
  // Fleet auth convention (signupAndLogin): seed the auth-bond localStorage
  // keys BEFORE navigating. A bare cookie + async session check raced the
  // guard on a slow API and bounced /now-playing to /login.
  await signupAndLogin(page, {
    email: `e2e-${Date.now()}-np@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
    baseUrl: BASE_URL,
  })
  await page.goto(`${BASE_URL}/now-playing`)
  expect(page.url()).not.toContain('/login')
})

test('happy path: recording a play succeeds and returns played:true', async ({ request }) => {
  const { authHeaders } = await apiSignup(request, {
    email: `e2e-${Date.now()}-nph@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const { tracks } = await seedArtistTree()
  const res = await request.post(`${API_URL}/api/tracks/${tracks[0].id}/play`, {
    headers: authHeaders,
    data: {},
    failOnStatusCode: false,
  })
  expect(res.ok()).toBe(true)
  const body = (await res.json()) as { played: boolean }
  expect(body.played).toBe(true)
})

test('validation failure: POST /api/tracks/:id/audio with malformed body is rejected (400)', async ({
  request,
}) => {
  const { authHeaders } = await apiSignup(request, {
    email: `e2e-${Date.now()}-npv@flagship.test`,
    password: 'TestPass!1',
    apiUrl: API_URL,
  })
  const { tracks } = await seedArtistTree()
  const res = await request.post(`${API_URL}/api/tracks/${tracks[0].id}/audio`, {
    headers: authHeaders,
    data: { audio_url: 'not-a-url' },
    failOnStatusCode: false,
  })
  // The handler validates `audio_url` with `z.string().url()` — a
  // non-URL value must be rejected with 400 (no crash, no 500).
  expect(res.status()).toBe(400)
})

test('authorization failure: anonymous POST /tracks/:id/play returns 401', async ({ request }) => {
  const { tracks } = await seedArtistTree()
  const res = await request.post(`${API_URL}/api/tracks/${tracks[0].id}/play`, {
    data: {},
    failOnStatusCode: false,
  })
  expect([401, 403]).toContain(res.status())
})
