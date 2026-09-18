import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/my-bids', () => {
  test('renders heading after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-bids')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('sidebar Browse link goes to /auctions', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-bids')
    await page
      .getByRole('link', { name: /^Browse$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/auctions/)
  })

  test('page load fetches /api/my-bids', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/my-bids')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/my-bids/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })
})
