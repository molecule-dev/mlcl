import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/vendor/orders', () => {
  test('page renders heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/orders')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    await page.goto(APP_BASE + '/vendor/orders')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('fetches /api/vendors/me/orders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/orders')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/vendor/orders')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/vendors\/me\/orders/.test(r.url))).toBeTruthy()
  })

  test('KPI labels render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/orders')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    await page.goto(APP_BASE + '/vendor/orders')
    await expect(page.getByText(/Awaiting fulfillment/i)).toBeVisible()
  })
})
