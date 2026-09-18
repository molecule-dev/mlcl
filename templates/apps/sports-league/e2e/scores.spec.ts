import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, api, apiRaw, promoteToAdmin, signup } from './_helpers.js'

test('GET /api/scores/:gameId returns events for a live game', async ({ page, request }) => {
  const live = await request.get(`${API_BASE}/scores/live`)
  const liveBody = await live.json()
  const inProg = (liveBody.data as Array<{ id: string }>)[0]
  expect(inProg, 'the league has a game in progress').toBeTruthy()

  const detailResp = await request.get(`${API_BASE}/scores/${inProg.id}`)
  expect(detailResp.status()).toBe(200)
  const detail = await detailResp.json()
  expect(Array.isArray(detail.events), 'events array').toBe(true)
  expect(detail.events.length).toBeGreaterThan(0)
  const lastEvent = detail.events[detail.events.length - 1]
  expect(lastEvent.period).toBeGreaterThanOrEqual(1)
})

test('League operator can update the score on an un-owned game', async ({ page }) => {
  await signup(page)
  // Score writes are league-operator (admin) gated via requireAdmin; a fresh
  // signup defaults to role='user'. Become the operator before the write.
  await promoteToAdmin(page)
  // Pull the live game id
  const live = await api<{ data: Array<{ id: string; home_score: number }> }>(
    page,
    'GET',
    '/scores/live',
  )
  const game = live.data[0]
  expect(game).toBeTruthy()
  const newScore = (game.home_score ?? 0) + 1
  const updated = await api<{ home_score: number }>(page, 'POST', `/scores/${game.id}`, {
    home_score: newScore,
  })
  expect(Number(updated.home_score)).toBe(newScore)

  // Read-after-write
  const reread = await api<{ home_score: number }>(page, 'GET', `/scores/${game.id}`)
  expect(Number(reread.home_score)).toBe(newScore)
})

test('Unauthenticated score updates are rejected with 401', async ({ request }) => {
  const live = await request.get(`${API_BASE}/scores/live`)
  const liveBody = await live.json()
  const game = (liveBody.data as Array<{ id: string }>)[0]
  const resp = await request.post(`${API_BASE}/scores/${game.id}`, {
    data: { home_score: 99 },
  })
  expect(resp.status()).toBe(401)
})
