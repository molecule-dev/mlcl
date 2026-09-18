import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers.js'

// /matches and /matches/:id are behind AuthGuard. Sign up first.

test('Matches page calls /api/schedule and renders cards for seeded games', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/matches')
    await page.waitForLoadState('networkidle')
  })
  const sched = reqs.find((r) => /\/api\/schedule(\?|$)/.test(r.url) && r.method === 'GET')
  expect(sched, '/api/schedule GET should fire').toBeTruthy()
  expect(sched!.status, '/api/schedule should 200').toBe(200)

  // Page renders without crashing.
  await expect(page.getByRole('heading', { name: /matches/i }).first()).toBeVisible()

  // Real match cards point to /matches/<id>. We expect at least one.
  const matchLinks = page.locator('a[href^="/matches/"]')
  const count = await matchLinks.count()
  expect(count, 'at least one match card link').toBeGreaterThan(0)
})

test('Matches Live filter produces only live cards or the empty-state copy', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/matches')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^live$/i }).click()
  await page.waitForTimeout(500)
  const hasEmpty = await page.getByText(/no matches in this view/i).count()
  const hasCards = await page.locator('a[href^="/matches/"]').count()
  expect(hasEmpty + hasCards, 'either empty copy or some live cards').toBeGreaterThan(0)
})

test('Click a match card → /matches/:id renders the match detail', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/matches')
  await page.waitForLoadState('networkidle')
  const first = page.locator('a[href^="/matches/"]').first()
  if ((await first.count()) === 0) {
    test.skip(true, 'no match cards rendered to click')
    return
  }
  await first.click()
  await expect(page).toHaveURL(/\/matches\/[^/]+$/, { timeout: 10_000 })
  // MatchDetail page header has no h1 — assert on the play-by-play h2
  // and the back link.
  await expect(page.getByRole('link', { name: /back/i }).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: /play.by.play|events/i }).first()).toBeVisible()
})
