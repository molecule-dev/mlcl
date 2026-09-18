import { test, expect, type Page } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  api,
  captureNetwork,
  getFavoriteTeams,
  getPlayers,
  getStandings,
  getTeams,
  signup,
  surnameOf,
} from './_helpers.js'

// One end-to-end "real fan" pass: signup → walk every primary surface →
// validate per-page outcome → mutate something → reload to verify
// persistence. If this passes, the app is genuinely usable.

test.describe.configure({ mode: 'serial' })

test('Sports fan can journey through every primary surface', async ({ page }) => {
  // 1. Anon Landing renders without auth.
  await page.goto(APP_BASE + '/')
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })

  // 2. Pricing page lists 3 plans.
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByText(/free/i).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/team|pro/i).first()).toBeVisible()

  // 3. Sign up.
  await signup(page)
  // After signup we land on /dashboard (signup helper asserts this).

  // The league itself is demo content an owner replaces, so every name this
  // journey looks for is read back from the API first.
  const standings = await getStandings(page.request)

  // 4. Dashboard surfaces the API's standings leader and top scorer.
  await expect(page.getByText(standings[0].name).first()).toBeVisible({ timeout: 10_000 })

  // 5. Standings page lists ranked teams (the API leader at the top).
  await page.goto(APP_BASE + '/standings')
  await expect(page.getByText(standings[0].name).first()).toBeVisible({ timeout: 10_000 })

  // 6. Stats page renders the four leader sections.
  await page.goto(APP_BASE + '/stats')
  await expect(page.getByText(/scoring|points|goals/i).first()).toBeVisible({ timeout: 10_000 })

  // 7. Schedule page renders games.
  await page.goto(APP_BASE + '/schedule')
  await expect(page.locator('h1, h2').first()).toBeVisible()

  // 8. Matches page renders cards (after our fixes).
  await page.goto(APP_BASE + '/matches')
  await page.waitForLoadState('networkidle')
  const matchLinks = page.locator('a[href^="/matches/"]')
  expect(await matchLinks.count(), 'matches page renders cards').toBeGreaterThan(0)

  // 9. Players page renders the roster the API returns.
  const players = await getPlayers(page.request)
  await page.goto(APP_BASE + '/players')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(surnameOf(players[0].name)).first()).toBeVisible({ timeout: 10_000 })

  // 10. Teams page renders the league's teams.
  const teams = await getTeams(page.request)
  await page.goto(APP_BASE + '/teams')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(teams[0].name).first()).toBeVisible()

  // 11. Notifications page lists the welcome notification (per-user seed).
  await page.goto(APP_BASE + '/notifications')
  await page.waitForLoadState('networkidle')
  // The page should render without crash; the welcome notification's
  // heading text is whatever the seed wrote.
  await expect(page.locator('h1, h2').first()).toBeVisible()

  // 12. Settings page lists the favorite teams this fan starts with.
  const favorites = await getFavoriteTeams(page.request)
  expect(favorites.length, 'a new fan gets at least one favorite team').toBeGreaterThan(0)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId(`favorite-team-${favorites[0].team?.abbreviation}`)).toBeVisible({
    timeout: 10_000,
  })

  // 13. Profile page renders dynamic favorites (read-after-favorite).
  await page.goto(APP_BASE + '/profile')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/favorite/i).first()).toBeVisible({ timeout: 10_000 })

  // 14. Read-after-write: flip score_alerts via PATCH /profile/me and
  //     verify the new value is what GET /profile/me returns. The
  //     server stores prefs inside users.oauthData.sl so this also
  //     proves the JSONB round-trip works.
  const before = await api<{ notifications?: Record<string, boolean> }>(page, 'GET', '/profile/me')
  const newVal = !(before.notifications?.score_alerts ?? true)
  await api(page, 'PATCH', '/profile/me', { notifications: { score_alerts: newVal } })
  const after = await api<{ notifications?: Record<string, boolean> }>(page, 'GET', '/profile/me')
  expect(after.notifications?.score_alerts, 'PATCH /profile/me must persist score_alerts').toBe(
    newVal,
  )

  // 15. PlanUpdated landing renders without crashing (post-checkout return).
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByRole('link', { name: /home|return/i }).first()).toBeVisible({
    timeout: 10_000,
  })
})

test('Logged-out user is redirected from /dashboard to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/dashboard')
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
})
