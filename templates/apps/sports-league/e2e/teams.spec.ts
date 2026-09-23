import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, api, apiRaw, getAccessToken, getTeams, signup } from './_helpers.js'

test('Authenticated user can create a team and read it back (read-after-write)', async ({
  page,
}) => {
  await signup(page)
  const created = await api<{ id: string; name: string }>(page, 'POST', '/teams', {
    name: 'My Local FC',
    abbreviation: 'MLF',
    city: 'Springfield',
    division: 'East',
    primary_color: '#aabbcc',
  })
  expect(created.id).toBeTruthy()
  expect(created.name).toBe('My Local FC')

  const fresh = await api<{ id: string; name: string }>(page, 'GET', `/teams/${created.id}`)
  expect(fresh.id).toBe(created.id)
  expect(fresh.name).toBe('My Local FC')

  // Cleanup: the suite shares one seeded DB across runs — a leftover fixed-name
  // team breaks seed.spec's abbreviation-uniqueness invariant on every re-run.
  const del = await apiRaw(page, 'DELETE', `/teams/${created.id}`)
  expect(del.status(), 'owner can delete the team they created').toBe(204)
})

test('Owner can update their own team but not someone else’s', async ({ page, browser }) => {
  // Owner creates a team
  await signup(page)
  const team = await api<{ id: string }>(page, 'POST', '/teams', {
    name: 'Owner FC',
    abbreviation: 'OFC',
  })

  // A different user signs up in a fresh browser context
  const ctx2 = await browser.newContext()
  const page2 = await ctx2.newPage()
  await signup(page2)

  // Read is public for everyone
  const read = await api<{ name: string }>(page2, 'GET', `/teams/${team.id}`)
  expect(read.name).toBe('Owner FC')

  // Update from a non-owner returns 403
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = await getAccessToken(page2)
  if (token) headers.Authorization = `Bearer ${token}`
  const resp = await page2.request.fetch(`${API_BASE}/teams/${team.id}`, {
    method: 'PUT',
    headers,
    data: JSON.stringify({ name: 'Hijacked' }),
  })
  expect(resp.status()).toBe(403)

  await ctx2.close()

  // Cleanup (see first test): remove the fixed-abbreviation team this run made.
  const del = await apiRaw(page, 'DELETE', `/teams/${team.id}`)
  expect(del.status(), 'cleanup delete succeeded').toBe(204)
})

test('Teams page renders every team the API returns', async ({ page }) => {
  await signup(page)
  // Which teams, and how many, come from the API — naming demo teams breaks
  // the spec the moment an owner replaces the league.
  const teams = await getTeams(page.request)
  await page.goto(APP_BASE + '/teams')
  await expect(page.getByRole('heading', { name: /teams/i }).first()).toBeVisible({
    timeout: 15_000,
  })
  for (const team of teams) {
    await expect(page.getByRole('heading', { name: team.name }).first()).toBeVisible({
      timeout: 15_000,
    })
  }
})
