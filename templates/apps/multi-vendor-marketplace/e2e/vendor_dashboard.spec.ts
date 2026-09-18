import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/vendor/dashboard', () => {
  test('dashboard renders heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/dashboard')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    await page.goto(APP_BASE + '/vendor/dashboard')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('fetches /api/vendors/me/dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/dashboard')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/vendor/dashboard')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/vendors\/me\/dashboard/.test(r.url))).toBeTruthy()
  })

  test('new product link navigates', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/dashboard')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    await page.goto(APP_BASE + '/vendor/dashboard')
    await page.locator('a[href="/vendor/products/new"]').first().click()
    await expect(page).toHaveURL(/\/vendor\/products\/new/)
  })
})
