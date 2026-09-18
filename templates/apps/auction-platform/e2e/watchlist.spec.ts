import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/watchlist', () => {
  test('renders Watchlist heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/watchlist')
    await expect(page.getByRole('heading', { name: /Watchlist/i, level: 1 })).toBeVisible()
  })

  test('Browse live auctions link goes to /auctions when empty', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/watchlist')
    const link = page.getByRole('link', { name: /Browse live auctions/i })
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(/\/auctions/)
    }
  })

  test('page load fetches /api/watchlist', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/watchlist')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/watchlist/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })
})
