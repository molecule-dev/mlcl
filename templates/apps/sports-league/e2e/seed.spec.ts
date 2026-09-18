import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, api, getTeams, signup } from './_helpers.js'

// The league catalog these specs assert on is read back from the API. The demo
// league is the first thing an app's owner replaces, so what is checked here is
// the SHAPE the pages depend on — hydrated rows, a real ranking, a live game —
// never which particular teams or players happen to be in it.

test('GET /api/teams returns the league roster with unique abbreviations (no auth required)', async ({
  request,
}) => {
  const teams = await getTeams(request)
  for (const team of teams) {
    expect(team.name, 'every team is named').toBeTruthy()
    expect(team.abbreviation, `team ${team.name} has an abbreviation`).toBeTruthy()
  }
  const abbrs = new Set(teams.map((t) => t.abbreviation))
  expect(abbrs.size, 'team abbreviations are unique').toBe(teams.length)
})

test('GET /api/standings returns rows ranked by points, best team first', async ({ request }) => {
  const resp = await request.get(`${API_BASE}/standings`)
  expect(resp.status()).toBe(200)
  const body = await resp.json()
  const rows = (body.data ?? []) as Array<{
    rank: number
    wins: number
    points: number
    name: string
  }>
  expect(rows.length).toBeGreaterThan(0)
  // The leader is whichever team the API puts on top — cross-check it is a real
  // team and that it really does hold the most points.
  const teams = await getTeams(request)
  expect(
    teams.some((t) => t.name === rows[0].name),
    `standings leader ${rows[0].name} is one of the league's teams`,
  ).toBe(true)
  expect(rows[0].rank).toBe(1)
  expect(rows[0].points).toBe(Math.max(...rows.map((r) => r.points)))
  expect(rows[0].wins).toBeGreaterThanOrEqual(0)
  // Sort invariant: points monotonically decreasing.
  for (let i = 1; i < rows.length; i++) {
    expect(rows[i].points).toBeLessThanOrEqual(rows[i - 1].points)
  }
})

test('GET /api/scores/live returns in-progress games with hydrated team rows', async ({
  request,
}) => {
  const resp = await request.get(`${API_BASE}/scores/live`)
  expect(resp.status()).toBe(200)
  const body = await resp.json()
  const games = (body.data ?? []) as Array<{
    status: string
    home_score: number
    away_score: number
    home_team?: { abbreviation?: string } | null
    away_team?: { abbreviation?: string } | null
  }>
  expect(games.length).toBeGreaterThanOrEqual(1)
  for (const g of games) {
    // The endpoint's contract: only live games, both sides hydrated so the
    // ticker can render them, and scores that are real numbers.
    expect(g.status).toBe('in_progress')
    expect(g.home_team?.abbreviation, 'home team hydrated').toBeTruthy()
    expect(g.away_team?.abbreviation, 'away team hydrated').toBeTruthy()
    expect(Number(g.home_score)).toBeGreaterThanOrEqual(0)
    expect(Number(g.away_score)).toBeGreaterThanOrEqual(0)
  }
})

test('GET /api/schedule returns hydrated games with home_team and away_team rows', async ({
  request,
}) => {
  const resp = await request.get(`${API_BASE}/schedule?limit=50`)
  expect(resp.status()).toBe(200)
  const body = await resp.json()
  const games = (body.data ?? []) as Array<{ home_team?: { name?: string } | null }>
  expect(games.length).toBeGreaterThan(0)
  // Every game must have hydrated team rows so the UI can render names/colors.
  const hydrated = games.filter((g) => g.home_team?.name)
  expect(hydrated.length).toBe(games.length)
})

test('A fresh signup starts with favorite teams from the league and a welcome notification', async ({
  page,
}) => {
  await signup(page)
  const favs = await api<{ data: Array<{ team?: { abbreviation?: string } | null }> }>(
    page,
    'GET',
    '/favorite-teams',
  )
  expect(favs.data.length, 'a new fan gets at least one favorite team').toBeGreaterThan(0)
  // Each default favorite must point at a team the league actually has.
  const abbrs = new Set((await getTeams(page.request)).map((t) => t.abbreviation))
  for (const fav of favs.data) {
    expect(
      abbrs.has(String(fav.team?.abbreviation)),
      `favorite ${fav.team?.abbreviation} is one of the league's teams`,
    ).toBe(true)
  }

  const notifs = await api<{
    data: Array<{ type: string; title: string }>
    meta: { unread: number }
  }>(page, 'GET', '/notifications')
  expect(notifs.meta.unread).toBeGreaterThanOrEqual(1)
  expect(
    notifs.data.find((n) => n.type === 'welcome'),
    'a welcome notification is created on signup',
  ).toBeTruthy()
})
