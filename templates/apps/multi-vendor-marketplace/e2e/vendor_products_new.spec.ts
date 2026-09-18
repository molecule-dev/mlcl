import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/vendor/products/new', () => {
  test('name field accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/products/new')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    await page.goto(APP_BASE + '/vendor/products/new')
    await page.getByTestId('vendor-product-name').fill('Walker Basket')
    await expect(page.getByTestId('vendor-product-name')).toHaveValue('Walker Basket')
  })

  test('price field accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/products/new')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    await page.goto(APP_BASE + '/vendor/products/new')
    await page.getByTestId('vendor-product-price').fill('45.00')
    await expect(page.getByTestId('vendor-product-price')).toHaveValue('45.00')
  })

  test('publish POSTs /api/products', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/products/new')
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Test Vendor ' + Date.now(), storeDescription: 'd' },
    })
    await page.goto(APP_BASE + '/vendor/products/new')
    await page.getByTestId('vendor-product-name').fill('Walker Basket ' + Date.now())
    await page.getByTestId('vendor-product-price').fill('45.00')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('vendor-product-publish').click()
      await page.waitForTimeout(1500)
    })
    expect(reqs.some((r) => /\/api\/products/.test(r.url) && r.method === 'POST')).toBeTruthy()
  })
})
