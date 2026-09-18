import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/privacy', () => {
  test('renders the static "Privacy notice" heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /Privacy/i, level: 1 })).toBeVisible()
  })

  test('renders the privacy main element via [data-mol-id]', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('[data-mol-id="page-privacy"]')).toBeVisible()
  })

  test('renders the "What we store" section heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /What we store/i })).toBeVisible()
  })

  test('renders the "Your controls" section heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /Your controls/i })).toBeVisible()
  })

  test('page is fully static — no /api calls fire on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/privacy')
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls, 'static privacy page should not call any /api endpoint').toEqual([])
  })
})
