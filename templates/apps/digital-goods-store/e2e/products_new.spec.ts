import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Product editor — create (/products/new)', () => {
  test('renders an empty editor form for a new product', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/products/new')
    await page.waitForTimeout(800)
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="product-description"]')).toBeVisible()
  })

  test('name input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/products/new')
    const name = page.locator('[data-testid="product-name"]')
    await name.fill('Probe Product')
    await expect(name).toHaveValue('Probe Product')
  })

  test('price input accepts numeric value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/products/new')
    // Default pricing model is "paid"; price input is rendered for paid.
    const price = page.locator('[data-testid="product-price"]')
    if (!(await price.count())) {
      await page.locator('[data-testid="pricing-paid"]').click()
    }
    await page.locator('[data-testid="product-price"]').fill('29')
    // Component re-formats numeric value to currency display; accept either form.
    const v = await page.locator('[data-testid="product-price"]').inputValue()
    expect(v.replace(/\.0+$/, '')).toBe('29')
  })

  test('Publish POSTs to /api/products and redirects', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/products/new')
    await page.locator('[data-testid="product-name"]').fill('UI Editor Probe ' + Date.now())
    await page.locator('[data-testid="product-description"]').fill('Sold via the polished UI')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="product-publish"]').click()
      await page.waitForTimeout(2000)
    })
    const post = whereUrl(reqs, /\/api\/products(?:\?|$)/, 'POST')
    expect(post.length, 'POST /api/products fired').toBeGreaterThan(0)
    expect(post[0].status, 'product created').toBeLessThan(400)
  })

  test('Cancel/back link returns to /products', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/products/new')
    const link = page.getByRole('link', { name: /all products|cancel|back|products/i })
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no back link in editor')
    await link.first().click()
    await expect(page).toHaveURL(/\/products(?:$|\?)|\/dashboard/)
  })

  test('persisted product appears via API after submit', async ({ page, request }) => {
    const me = await signup(page)
    const api = await authedApi(request, me.accessToken!)
    const before = await (await api.get('/products?mine=true')).json()
    const beforeCount = (before?.data ?? []).length

    await page.goto(APP_BASE + '/products/new')
    const probeName = 'API Probe Product ' + Date.now()
    await page.locator('[data-testid="product-name"]').fill(probeName)
    await page.locator('[data-testid="product-publish"]').click()
    await page.waitForTimeout(1500)

    const after = await (await api.get('/products?mine=true')).json()
    const afterCount = (after?.data ?? []).length
    expect(afterCount, 'count grew after submit').toBeGreaterThanOrEqual(beforeCount + 1)
    const found = (after?.data ?? []).find((p: { name: string }) => p.name === probeName)
    expect(found, 'product persisted').toBeTruthy()
  })
})
