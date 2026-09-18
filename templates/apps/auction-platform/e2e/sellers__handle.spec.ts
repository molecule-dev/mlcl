import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/sellers/:handle', () => {
  test('shows friendly not-found copy for bogus handle', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sellers/__definitely_not_a_real_seller__')
    await expect(page.getByText(/We could not find that seller|not found/i).first()).toBeVisible({
      timeout: 8000,
    })
  })

  test('page load fetches /api/sellers/:handle', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/sellers/__definitely_not_a_real_seller__')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/sellers\//.test(r.url) && r.method === 'GET')).toBeTruthy()
  })
})
