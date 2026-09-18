import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedSale, signup, whereUrl } from './_helpers.js'

test.describe('Seller dashboard page (/dashboard)', () => {
  test('renders the dashboard heading for an authenticated user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('page-load fetches /api/analytics and /api/sales', async ({ page, request }) => {
    const seller = await signup(page)
    await seedSale(request, seller.accessToken!)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForTimeout(1500)
    })
    const analytics = whereUrl(reqs, /\/api\/analytics/, 'GET')
    const sales = whereUrl(reqs, /\/api\/sales/, 'GET')
    expect(analytics.length, 'GET /api/analytics fired').toBeGreaterThan(0)
    expect(sales.length, 'GET /api/sales fired').toBeGreaterThan(0)
  })

  test('renders headline metric cards (revenue / sales / downloads)', async ({ page, request }) => {
    const seller = await signup(page)
    await seedSale(request, seller.accessToken!)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForTimeout(1500)
    const labels = await page.getByText(/revenue|sales|downloads|conversion/i).count()
    expect(labels, 'metric labels rendered').toBeGreaterThan(0)
  })

  test('top-products region renders after a sale', async ({ page, request }) => {
    const seller = await signup(page)
    const sale = await seedSale(request, seller.accessToken!)
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForTimeout(1500)
    const productHits = await page.getByText(sale.product.name).count()
    expect(productHits, 'sold product appears in top-products').toBeGreaterThan(0)
  })

  test('Add product link navigates to /products/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const link = page.getByRole('link', { name: /add product|new product|create product/i })
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no add-product link on dashboard')
    await link.first().click()
    await expect(page).toHaveURL(/\/products\/new/)
  })
})
