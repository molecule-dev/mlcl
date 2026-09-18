import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, getPlayers, signup } from './_helpers.js'

// Players page must render the roster the API returns — hydrated with
// team_abbr, team_color, position short codes (F/M/D/GK) and aggregated
// stats — NOT the FALLBACK static data.
//
// All these tests authenticate first because /players is behind
// AuthGuard in App.tsx (the Pennant shell layer).

test('Players page renders the roster the API returns', async ({ page }) => {
  await signup(page)
  // Which player to look for comes from the API — naming one couples the spec
  // to the demo roster, which is the first thing an owner replaces.
  const players = await getPlayers(page.request)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/players')
    await page.waitForLoadState('networkidle')
  })
  // The /api/players endpoint must have been called.
  const playersCall = reqs.find((r) => /\/api\/players(\?|$)/.test(r.url) && r.method === 'GET')
  expect(playersCall, '/api/players GET should fire').toBeTruthy()
  expect(playersCall!.status, '/api/players should 200').toBe(200)

  // A player the API returned must appear on the page.
  await expect(page.getByText(players[0].name).first()).toBeVisible({ timeout: 10_000 })
})

test('Players position filter narrows the visible roster (GK only)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/players')
  await page.waitForLoadState('networkidle')
  // Click the GK filter — there should be at least one goalkeeper on the roster.
  await page.getByRole('button', { name: /^GK$/ }).click()
  await page.waitForTimeout(500)
  // After the GK filter every visible position cell must read "GK".
  const positionCells = page.locator('table tbody tr td:nth-child(3)')
  const count = await positionCells.count()
  expect(count, 'at least one GK row after filter').toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    const txt = (await positionCells.nth(i).innerText()).trim()
    expect(txt, `row ${i} position must be GK`).toBe('GK')
  }
})

test('Players page → click a player → /players/:id renders the player detail', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/players')
  await page.waitForLoadState('networkidle')
  // Click the first player link in the table.
  const firstLink = page.locator('table tbody a').first()
  await expect(firstLink).toBeVisible({ timeout: 10_000 })
  await firstLink.click()
  await expect(page).toHaveURL(/\/players\/[^/]+$/, { timeout: 10_000 })
  // Player detail must render a name (h1).
  await expect(page.locator('h1').first()).toBeVisible()
})

test('GET /api/players returns hydrated player rows with aggregated stats', async ({ page }) => {
  await signup(page)
  const resp = await page.request.get(API_BASE + '/players?limit=20')
  expect(resp.status()).toBe(200)
  const body = await resp.json()
  const rows = Array.isArray(body) ? body : body.data || []
  expect(rows.length, 'the roster is not empty').toBeGreaterThan(0)
  // Every row's `position` (the short field used by the UI filter) must
  // be one of F/M/D/GK — never the legacy "Forward" / "Midfielder".
  for (const r of rows) {
    if (r.position) {
      expect(['F', 'M', 'D', 'GK'], `position should be a short code, got ${r.position}`).toContain(
        r.position,
      )
    }
  }
  // Goals must aggregate onto the rows, otherwise the leaderboards are empty.
  const totalGoals = rows.reduce((sum: number, r: { goals?: number }) => sum + (r.goals ?? 0), 0)
  expect(totalGoals, 'aggregate goals should be > 0').toBeGreaterThan(0)
  // And every row should have team_abbr + team_color hydrated (no nulls
  // for active rows that have a team_id).
  for (const r of rows) {
    if (r.team_id) {
      expect(r.team_abbr, `player ${r.name} missing team_abbr`).toBeTruthy()
      expect(r.team_color, `player ${r.name} missing team_color`).toBeTruthy()
    }
  }
})
