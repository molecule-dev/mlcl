import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('archive page', () => {
  test('renders the archive page (empty by default for a new user)', async ({ page }) => {
    await signup(page, uniqueEmail('archive'))
    await page.goto(APP_BASE + '/archive')
    await expect(page.getByText(/archive/i).first()).toBeVisible()
  })

  test('GET /api/conversations is hit on archive load', async ({ page }) => {
    await signup(page, uniqueEmail('archive-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/archive')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/conversations/.test(r.url))).toBeTruthy()
  })
})
