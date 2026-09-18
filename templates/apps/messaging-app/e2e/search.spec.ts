import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('search page', () => {
  test('renders the search input', async ({ page }) => {
    await signup(page, uniqueEmail('search'))
    await page.goto(APP_BASE + '/search')
    await expect(page.getByRole('searchbox')).toBeVisible()
  })

  test('typing a query hits /api/search', async ({ page }) => {
    await signup(page, uniqueEmail('search-net'))
    await page.goto(APP_BASE + '/search')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('searchbox').fill('avery')
      await page.waitForTimeout(800) // debounce
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/search/.test(r.url))).toBeTruthy()
  })
})
