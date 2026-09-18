import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, getFavoriteTeams, signup } from './_helpers.js'

test('Settings page lists the favorite teams a fresh fan starts with', async ({ page }) => {
  await signup(page)
  // Which teams a new fan starts favoriting is demo content — read them back
  // from the API and assert the page renders exactly those.
  const favorites = await getFavoriteTeams(page.request)
  expect(favorites.length, 'a new fan gets at least one favorite team').toBeGreaterThan(0)
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible()
  for (const favorite of favorites) {
    await expect(page.getByTestId(`favorite-team-${favorite.team?.abbreviation}`)).toBeVisible({
      timeout: 15_000,
    })
  }
})

test('Toggling notification prefs persists via PATCH /api/profile/me (read-after-write)', async ({
  page,
}) => {
  await signup(page)
  // Initial defaults
  const before = await api<{
    notifications: { score_alerts: boolean; injury_alerts: boolean }
  }>(page, 'GET', '/profile/me')
  expect(before.notifications.score_alerts).toBe(true)
  expect(before.notifications.injury_alerts).toBe(false)

  // Persist a flip
  const after = await api<{
    notifications: { score_alerts: boolean; injury_alerts: boolean }
  }>(page, 'PATCH', '/profile/me', { notifications: { score_alerts: false, injury_alerts: true } })
  expect(after.notifications.score_alerts).toBe(false)
  expect(after.notifications.injury_alerts).toBe(true)

  // Re-read confirms persistence
  const reread = await api<{
    notifications: { score_alerts: boolean; injury_alerts: boolean }
  }>(page, 'GET', '/profile/me')
  expect(reread.notifications.score_alerts).toBe(false)
  expect(reread.notifications.injury_alerts).toBe(true)
})

test('Adding a favorite team via the API updates GET /favorite-teams', async ({ page }) => {
  await signup(page)
  const teams = await api<{ data: Array<{ id: string; abbreviation: string }> }>(
    page,
    'GET',
    '/teams?limit=10',
  )
  // Whatever the fan already favorites is demo content, so read it first and
  // pick a team that is not already in the list.
  const before = await getFavoriteTeams(page.request)
  const alreadyFavorite = new Set(before.map((f) => f.team?.abbreviation))
  const target = teams.data.find((t) => !alreadyFavorite.has(t.abbreviation))
  expect(target, 'a team that is not already a favorite').toBeTruthy()

  await api(page, 'POST', '/favorite-teams', { team_id: target!.id })

  const after = await getFavoriteTeams(page.request)
  expect(after.length).toBe(before.length + 1)
  expect(after.map((f) => f.team?.abbreviation).sort()).toEqual(
    [...before.map((f) => f.team?.abbreviation), target!.abbreviation].sort(),
  )
})

test('Removing a favorite team via DELETE /favorite-teams/:id persists', async ({ page }) => {
  await signup(page)
  // Remove whichever team the fan already favorites, not a named one.
  const list = await getFavoriteTeams(page.request)
  const target = list[0]
  expect(target, 'a favorite team to remove').toBeTruthy()

  await api(page, 'DELETE', `/favorite-teams/${target.id}`)

  const after = await getFavoriteTeams(page.request)
  expect(after.find((f) => f.team?.abbreviation === target.team?.abbreviation)).toBeFalsy()
})
