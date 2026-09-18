import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/products', () => {
  test('product detail renders heading', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/products')
    const productsRes = await page.request.get(APP_BASE + '/api/products')
    const { data } = await productsRes.json()
    const id = (data ?? [])[0]?.id
    test.skip(!id, 'no products in DB')
    await page.goto(APP_BASE + '/products/' + id)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('add to cart POSTs /api/cart', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/products')
    const productsRes = await page.request.get(APP_BASE + '/api/products')
    const { data } = await productsRes.json()
    const id = (data ?? [])[0]?.id
    test.skip(!id, 'no products in DB')
    await page.goto(APP_BASE + '/products/' + id)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Add to cart/i }).click()
      await page.waitForTimeout(800)
    })
    expect(reqs.some((r) => /\/api\/cart/.test(r.url) && r.method === 'POST')).toBeTruthy()
  })

  test('quantity increment changes value', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/products')
    const productsRes = await page.request.get(APP_BASE + '/api/products')
    const { data } = await productsRes.json()
    const id = (data ?? [])[0]?.id
    test.skip(!id, 'no products in DB')
    await page.goto(APP_BASE + '/products/' + id)
    const inc = page.getByRole('button', { name: /Increase quantity/i })
    await inc.click()
    await inc.click()
    await expect(page.locator('body')).toContainText(/3/)
  })
})
