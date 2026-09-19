import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/leaderboard')
  })

  test('fetches the board via GET /api/leaderboard', async ({ page }) => {
    const respPromise = page.waitForResponse((r) => /\/api\/leaderboard/.test(r.url()))
    await page.goto(APP_BASE + '/leaderboard')
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { name: /^leaderboard$/i })).toBeVisible()
  })

  test('renders the two board sections', async ({ page }) => {
    await page.locator('[data-mol-id="daily-distribution"]').waitFor()
    await expect(page.locator('[data-mol-id="daily-distribution"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="streak-leaders"]')).toBeVisible()
  })

  test('daily distribution renders six attempt bins', async ({ page }) => {
    await page.locator('[data-mol-id="daily-distribution"]').waitFor()
    // Six proportional bars, one per attempt count — structure, not values.
    const bars = page.locator(
      '[data-mol-id="daily-distribution"] .h-6, [data-mol-id="daily-distribution"] .h-5',
    )
    expect(await bars.count()).toBeGreaterThanOrEqual(6)
  })

  test('streak leaders renders at least one row on a fresh DB', async ({ page }) => {
    await page.locator('[data-mol-id="streak-leaders"]').waitFor()
    const rows = page.locator('[data-mol-id^="streak-leader-"]')
    expect(await rows.count()).toBeGreaterThanOrEqual(1)
  })

  test('leader rows show max and current streaks', async ({ page }) => {
    await page.locator('[data-mol-id^="streak-leader-"]').first().waitFor()
    const first = page.locator('[data-mol-id^="streak-leader-"]').first()
    await expect(first).toContainText(/max/)
    await expect(first).toContainText(/now/)
  })

  test('CTA links to play and stats', async ({ page }) => {
    await page.locator('[data-mol-id="leaderboard-play-link"]').waitFor()
    await expect(page.locator('[data-mol-id="leaderboard-play-link"]')).toHaveAttribute(
      'href',
      '/play',
    )
    await expect(page.locator('[data-mol-id="leaderboard-stats-link"]')).toHaveAttribute(
      'href',
      '/stats',
    )
  })
})
