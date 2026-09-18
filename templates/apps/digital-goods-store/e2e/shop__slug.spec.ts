import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, whereUrl } from './_helpers.js'

test.describe('Product detail page (/shop/:slug)', () => {
  test('renders the product cover image and heading', async ({ page, request }) => {
    const list = await request.get(API_BASE + '/products')
    const products = (await list.json())?.data ?? []
    expect(products.length, 'seed products available').toBeGreaterThan(0)
    const first = products[0]
    await page.goto(APP_BASE + '/shop/' + first.slug)
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('page-load fetches /api/products/:slug', async ({ page, request }) => {
    const list = await request.get(API_BASE + '/products')
    const products = (await list.json())?.data ?? []
    const first = products[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/shop/' + first.slug)
      await page.waitForTimeout(800)
    })
    const get = whereUrl(reqs, /\/api\/products\//, 'GET')
    expect(get.length, 'product detail fetches a single product').toBeGreaterThan(0)
  })

  test('add-to-cart button works when present', async ({ page, request }) => {
    const list = await request.get(API_BASE + '/products')
    const products = (await list.json())?.data ?? []
    const first = products[0]
    await page.goto(APP_BASE + '/shop/' + first.slug)
    await page.waitForTimeout(800)
    const btn = page.getByRole('button', { name: /add to cart/i })
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await btn
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no add-to-cart on detail page')
    await btn.first().click()
    await page.goto(APP_BASE + '/cart')
    const items = await page.locator('article, li[data-testid="cart-item"]').count()
    expect(items).toBeGreaterThan(0)
  })

  test('buy-now / checkout button navigates onward', async ({ page, request }) => {
    const list = await request.get(API_BASE + '/products')
    const products = (await list.json())?.data ?? []
    const first = products[0]
    await page.goto(APP_BASE + '/shop/' + first.slug)
    await page.waitForTimeout(800)
    const btn = page.getByRole('button', { name: /buy now|checkout|purchase/i })
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await btn
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no buy-now button on detail page')
    await btn.first().click()
    await expect(page).toHaveURL(/\/checkout|\/login|\/signup|stripe/)
  })

  test('renders tags or category if product has them', async ({ page, request }) => {
    const list = await request.get(API_BASE + '/products')
    const products = (await list.json())?.data ?? []
    const tagged =
      products.find((p: { tags?: string[] }) => (p.tags ?? []).length > 0) || products[0]
    // Assert the product's OWN category/tags render. Naming the demo
    // catalog's categories made this fail for any product outside that set.
    const labels: string[] = [tagged.category, ...(tagged.tags ?? [])].filter(Boolean)
    expect(labels.length, 'the product under test has a category or tags').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/shop/' + tagged.slug)
    await page.waitForTimeout(800)
    await expect(page.getByText(labels[0]!).first()).toBeAttached()
  })
})
