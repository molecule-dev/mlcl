import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/vendor/payouts', () => {
  test('page renders heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/payouts')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    await page.goto(APP_BASE + '/vendor/payouts')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('fetches /api/vendors/me/payouts', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/payouts')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/vendor/payouts')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/vendors\/me\/payouts/.test(r.url))).toBeTruthy()
  })

  test('export CSV button is interactable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/payouts')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    await page.goto(APP_BASE + '/vendor/payouts')
    await expect(page.getByTestId('vendor-payouts-export')).toBeVisible()
    await page.getByTestId('vendor-payouts-export').click()
  })
})
