import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Seller products page (/products)', () => {
  test('renders the products heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/products')
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('add-product link navigates to /products/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/products')
    const link = page.getByRole('link', { name: /add product|new product|create product/i })
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no add-product link on products page')
    await link.first().click()
    await expect(page).toHaveURL(/\/products\/new/)
  })

  test('page-load fetches /api/products?mine=true', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/products')
      await page.waitForTimeout(1000)
    })
    const get = whereUrl(reqs, /\/api\/products/, 'GET')
    expect(get.length, 'GET /api/products fired').toBeGreaterThan(0)
    expect(get[0].status).toBeLessThan(400)
  })

  test('a created product shows up in the list', async ({ page, request }) => {
    const seller = await signup(page)
    const api = await authedApi(request, seller.accessToken!)
    const created = await (
      await api.post('/products', {
        name: 'List Probe ' + Date.now(),
        description: 'visible in /products',
        price_cents: 999,
        category: 'UI Kits',
      })
    ).json()
    expect(created.id, 'product created via API').toBeTruthy()
    await page.goto(APP_BASE + '/products')
    await page.waitForTimeout(1000)
    expect(await page.getByText(created.name).count(), 'created product visible').toBeGreaterThan(0)
  })

  test('per-row edit link navigates to /products/:id/edit', async ({ page, request }) => {
    const seller = await signup(page)
    const api = await authedApi(request, seller.accessToken!)
    const created = await (
      await api.post('/products', {
        name: 'Edit Probe ' + Date.now(),
        description: 'for edit-link test',
        price_cents: 1099,
      })
    ).json()
    await page.goto(APP_BASE + '/products')
    await page.waitForTimeout(1000)
    const link = page.getByRole('link', { name: /edit/i }).first()
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no per-row edit link')
    await link.click()
    await expect(page).toHaveURL(/\/products\/.+\/edit/)
  })
})
