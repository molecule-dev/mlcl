import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, getPlayers, signup } from './_helpers.js'

test('GET /stats/leaders/scoring resolves to the league goal-scorers', async ({ request }) => {
  const resp = await request.get(`${API_BASE}/stats/leaders/scoring?limit=5`)
  expect(resp.status()).toBe(200)
  const body = await resp.json()
  const leaders = (body.data ?? []) as Array<{
    rank: number
    name: string
    value: number
    unit?: string
  }>
  expect(leaders.length).toBeGreaterThan(0)
  // Who leads is read back from the roster rather than named: the demo league
  // gets replaced, the ranking contract does not.
  const players = await getPlayers(request, 50)
  expect(
    players.some((p) => p.name === leaders[0].name),
    `scoring leader ${leaders[0].name} is one of the league's players`,
  ).toBe(true)
  expect(leaders[0].rank).toBe(1)
  expect(leaders[0].value).toBe(Math.max(...leaders.map((l) => l.value)))
})

test('GET /stats/leaders/saves resolves keepers ranked by saves', async ({ request }) => {
  const resp = await request.get(`${API_BASE}/stats/leaders/saves?limit=5`)
  expect(resp.status()).toBe(200)
  const body = await resp.json()
  const leaders = (body.data ?? []) as Array<{
    rank: number
    name: string
    value: number
    unit?: string
  }>
  expect(leaders.length).toBeGreaterThan(0)
  expect(leaders[0].rank).toBe(1)
  expect(leaders[0].value).toBe(Math.max(...leaders.map((l) => l.value)))
  expect(leaders[0].unit).toBe('SAVES')
})

test('GET /stats/leaders/shots resolves shooters with the SHOTS unit', async ({ request }) => {
  const resp = await request.get(`${API_BASE}/stats/leaders/shots?limit=5`)
  expect(resp.status()).toBe(200)
  const body = await resp.json()
  const leaders = (body.data ?? []) as Array<{ name: string; value: number; unit?: string }>
  expect(leaders.length).toBeGreaterThan(0)
  expect(leaders[0].unit).toBe('SHOTS')
  expect(leaders[0].value).toBeGreaterThan(0)
})

test('GET /stats/leaders/assists resolves the canonical assists field', async ({ request }) => {
  const resp = await request.get(`${API_BASE}/stats/leaders/assists?limit=5`)
  expect(resp.status()).toBe(200)
  const body = await resp.json()
  const leaders = (body.data ?? []) as Array<{ name: string; value: number; unit?: string }>
  expect(leaders.length).toBeGreaterThan(0)
  expect(leaders[0].unit).toBe('AST')
  expect(leaders[0].value).toBeGreaterThan(0)
})

test('Stats page renders all four leader sections (Scoring, Assists, Saves, Shots)', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/stats')
  await expect(page.getByRole('heading', { name: /^stats$/i })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: /scoring leaders/i })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByRole('heading', { name: /assist leaders/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /save leaders/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /shot leaders/i })).toBeVisible()
})

test('observation invariant: /stats fires the four leaders requests', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/stats')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  for (const stat of ['scoring', 'assists', 'saves', 'shots']) {
    expect(
      reqs.find((r) => new RegExp(`/api/stats/leaders/${stat}`).test(r.url) && r.method === 'GET'),
      `GET /api/stats/leaders/${stat}`,
    ).toBeTruthy()
  }
})
