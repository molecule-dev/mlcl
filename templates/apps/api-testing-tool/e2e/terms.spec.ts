import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/terms', () => {
  test('renders the static "Terms of service" heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /Terms/i, level: 1 })).toBeVisible()
  })

  test('renders the terms main element via [data-mol-id]', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('[data-mol-id="page-terms"]')).toBeVisible()
  })

  test('renders the "Your account" section heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /Your account/i })).toBeVisible()
  })

  test('renders the "Billing" section heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /Billing/i })).toBeVisible()
  })

  test('page is fully static — no /api calls fire on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/terms')
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls, 'static terms page should not call any /api endpoint').toEqual([])
  })
})
