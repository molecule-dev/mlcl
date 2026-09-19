import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/stats', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/stats')
  })

  test('fetches stats via GET /api/stats/me', async ({ page }) => {
    const respPromise = page.waitForResponse((r) => /\/api\/stats\/me/.test(r.url()))
    await page.goto(APP_BASE + '/stats')
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { name: /your stats/i })).toBeVisible()
  })

  test('renders the four stat cards', async ({ page }) => {
    await page.getByRole('heading', { name: /your stats/i }).waitFor()
    for (const id of ['stat-played', 'stat-win-rate', 'stat-current-streak', 'stat-max-streak']) {
      await expect(page.locator(`[data-mol-id="${id}"]`)).toBeVisible()
    }
  })

  test('fresh account shows zero games played', async ({ page }) => {
    await page.locator('[data-mol-id="stat-played"]').waitFor()
    await expect(page.locator('[data-mol-id="stat-played"]')).toContainText('0')
  })

  test('guess distribution renders all six attempt rows', async ({ page }) => {
    await page.locator('[data-mol-id="guess-distribution"]').waitFor()
    for (let n = 1; n <= 6; n++) {
      await expect(page.locator(`[data-mol-id="dist-row-${n}"]`)).toBeVisible()
    }
  })

  test('CTA links to play and leaderboard', async ({ page }) => {
    await page.locator('[data-mol-id="stats-play-link"]').waitFor()
    await expect(page.locator('[data-mol-id="stats-play-link"]')).toHaveAttribute('href', '/play')
    await expect(page.locator('[data-mol-id="stats-leaderboard-link"]')).toHaveAttribute(
      'href',
      '/leaderboard',
    )
  })
})
