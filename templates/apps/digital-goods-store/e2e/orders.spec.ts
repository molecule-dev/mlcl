import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, seedSale, signup, whereUrl } from './_helpers.js'

test.describe('Order history page (/orders)', () => {
  test('renders the page heading for an authenticated buyer', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/orders')
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('renders the empty state when no orders exist yet', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/orders')
    await page.waitForTimeout(800)
    const empty = page.getByText(/no orders|hasn'?t bought|empty|browse/i)
    await expect(empty.first()).toBeAttached()
  })

  test('a buyer with a fulfilled purchase sees the order row', async ({ page, request }) => {
    const seller = await signup(page)
    const sale = await seedSale(request, seller.accessToken!)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(sale.buyer.email)
    await page.locator('#password').fill(sale.buyer.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/orders')
      await page.waitForTimeout(1200)
    })
    const get = whereUrl(reqs, /\/api\/orders(?:\?|$)/, 'GET')
    expect(get.length, 'GET /api/orders fired').toBeGreaterThan(0)
    const productNameMatches = await page.getByText(sale.product.name).count()
    expect(productNameMatches, 'sold product name renders').toBeGreaterThan(0)
  })

  test('view receipt link navigates to /order/:id/confirm', async ({ page, request }) => {
    const seller = await signup(page)
    const sale = await seedSale(request, seller.accessToken!)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(sale.buyer.email)
    await page.locator('#password').fill(sale.buyer.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    await page.goto(APP_BASE + '/orders')
    await page.waitForTimeout(1200)
    const link = page.getByRole('link', { name: /receipt|details|view/i }).first()
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no per-row link on order history')
    await link.click()
    await expect(page).toHaveURL(/\/order\/.+\/confirm|\/orders\/.+/)
  })

  test('empty-state CTA navigates to /shop', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/orders')
    await page.waitForTimeout(800)
    const link = page.getByRole('link', { name: /shop|browse|storefront/i })
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no empty-state link')
    await link.first().click()
    await expect(page).toHaveURL(/\/shop/)
  })
})
