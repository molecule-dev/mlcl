import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/vendor/products', () => {
  test('page renders heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/products')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    await page.goto(APP_BASE + '/vendor/products')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('fetches /api/vendors/me/products', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/products')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/vendor/products')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/vendors\/me\/products/.test(r.url))).toBeTruthy()
  })

  test('new product link navigates', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/products')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    await page.goto(APP_BASE + '/vendor/products')
    await page.locator('a[href="/vendor/products/new"]').first().click()
    await expect(page).toHaveURL(/\/vendor\/products\/new/)
  })
})
