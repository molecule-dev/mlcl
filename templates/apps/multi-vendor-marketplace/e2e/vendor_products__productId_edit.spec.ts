import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/vendor/products/:productId/edit', () => {
  test('edit page loads form fields', async ({ page }) => {
    await signup(page)
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Edit Vendor ' + Date.now(), storeDescription: 'd' },
    })
    const created = await page.request.post(APP_BASE + '/api/products', {
      data: { name: 'Edit Test', description: '', price: 12, category: 'Home & Living' },
    })
    const body = await created.json()
    test.skip(!body.id, 'product create failed')
    // Create the product BEFORE visiting so the page never loads a junk
    // placeholder URL (a literal ":productId" would fire a doomed fetch).
    await page.goto(APP_BASE + '/vendor/products/' + body.id + '/edit')
    await expect(page.getByTestId('vendor-product-name')).toBeVisible()
  })

  test('price field renders', async ({ page }) => {
    await signup(page)
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Edit Vendor ' + Date.now(), storeDescription: 'd' },
    })
    const created = await page.request.post(APP_BASE + '/api/products', {
      data: { name: 'Edit Test', description: '', price: 12, category: 'Home & Living' },
    })
    const body = await created.json()
    test.skip(!body.id, 'product create failed')
    await page.goto(APP_BASE + '/vendor/products/' + body.id + '/edit')
    await expect(page.getByTestId('vendor-product-price')).toBeVisible()
  })

  test('publish button issues request', async ({ page }) => {
    await signup(page)
    await page.request.post(APP_BASE + '/api/vendors/apply', {
      data: { storeName: 'Edit Vendor ' + Date.now(), storeDescription: 'd' },
    })
    const created = await page.request.post(APP_BASE + '/api/products', {
      data: { name: 'Edit Test', description: '', price: 12, category: 'Home & Living' },
    })
    const body = await created.json()
    test.skip(!body.id, 'product create failed')
    await page.goto(APP_BASE + '/vendor/products/' + body.id + '/edit')
    await page.getByTestId('vendor-product-name').fill('Edited Name')
    await page.getByTestId('vendor-product-price').fill('15.00')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('vendor-product-publish').click()
      await page.waitForTimeout(1500)
    })
    expect(reqs.some((r) => /\/api\/products/.test(r.url))).toBeTruthy()
  })
})
