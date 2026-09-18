import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, flipThemeAndAssertChanged, signup } from './_helpers.js'

test.describe('/leaderboard', () => {
  test('renders leaderboard landmark', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await expect(page.getByTestId('leaderboard')).toBeVisible()
  })

  test('renders header brand link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await expect(page.getByRole('link', { name: /^sparq/i }).first()).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await flipThemeAndAssertChanged(page)
  })

  test('user-menu opens with menu items', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await page
      .getByRole('button', { name: /open user menu|account|profile/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible()
  })

  test('renders the H1 "Top quizmasters"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await expect(page.getByRole('heading', { level: 1, name: /top quizmasters/i })).toBeVisible()
  })

  test('GET /api/leaderboard/global fires on load (gate-12)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/leaderboard')
      await page.waitForLoadState('networkidle')
    })
    const board = reqs.find((r) => r.method === 'GET' && /\/api\/leaderboard\/global/.test(r.url))
    expect(board, 'GET /api/leaderboard/global').toBeTruthy()
    expect(board?.status).toBe(200)
  })

  test('Empty state visible when no plays exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await page.waitForLoadState('networkidle')
    const empty = page.getByText(/no plays on the board yet/i)
    const podium = page.locator('[data-testid="leaderboard"] section')
    if ((await empty.count()) > 0) {
      await expect(empty).toBeVisible()
    } else {
      // populated state — at least the podium section renders
      await expect(podium.first()).toBeVisible()
    }
  })

  test('Podium section shows up to 3 entries when populated', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await page.waitForLoadState('networkidle')
    // Podium is the FIRST <section> under [data-testid="leaderboard"];
    // each podium player's score badge has the rank number 1, 2, or 3
    // inside a <span> with .font-black.
    const podiumSection = page.locator('[data-testid="leaderboard"] section').first()
    const rankBadges = podiumSection.locator('span.font-black')
    const count = await rankBadges.count()
    expect(count, 'podium rank badges').toBeGreaterThanOrEqual(1)
    expect(count, 'podium rank badges').toBeLessThanOrEqual(3)
    await expect(rankBadges.first()).toBeVisible()
  })

  test('Full ranking section visible when ≥ 4 entries (no-op otherwise)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await page.waitForLoadState('networkidle')
    const fullRank = page.getByRole('heading', { name: /full ranking/i })
    if ((await fullRank.count()) === 0) test.skip(true, '<4 entries on leaderboard')
    await expect(fullRank).toBeVisible()
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('Terms footer link → /terms', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await page.getByRole('link', { name: /terms/i }).first().click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('Language switcher button present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })
})
