import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/terms', () => {
  test('renders heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Gavl logo navigates back to /', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await page.getByRole('link', { name: /Gavl/i }).first().click()
    expect(page.url()).toMatch(/\/(?:|#top)?$/)
  })

  test('static page issues no /api/* requests on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/terms')
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls, 'no API calls expected for fully-static page').toEqual([])
  })
})
