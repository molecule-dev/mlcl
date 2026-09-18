import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/seller', () => {
  test('renders Seller dashboard heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/seller')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('New listing CTA navigates to /sell/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/seller')
    // The header "New listing" CTA is the canonical entry point — the
    // sidebar's "Seller" link already self-targets and would deadlock the
    // assertion. Match by exact aria-name.
    await page
      .getByRole('link', { name: /^add\s*New listing$|^New listing$/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/sell\/new/)
  })

  test('page load fetches /api/seller/stats', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/seller')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/seller\/stats/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })
})
