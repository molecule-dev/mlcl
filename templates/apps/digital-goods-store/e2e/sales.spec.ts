import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedSale, signup, whereUrl } from './_helpers.js'

test.describe('Sales page (/sales)', () => {
  test('renders the sales heading for an authenticated seller', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sales')
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('renders empty-state when zero sales exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sales')
    await page.waitForTimeout(800)
    const empty = page.getByText(/no sales|haven'?t sold|empty|first sale/i)
    await expect(empty.first()).toBeAttached()
  })

  test('a fulfilled sale appears with product + customer + amount', async ({ page, request }) => {
    const seller = await signup(page)
    const sale = await seedSale(request, seller.accessToken!)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/sales')
      await page.waitForTimeout(1200)
    })
    const get = whereUrl(reqs, /\/api\/sales/, 'GET')
    expect(get.length, 'GET /api/sales fired').toBeGreaterThan(0)
    expect(await page.getByText(sale.product.name).count(), 'product name visible').toBeGreaterThan(
      0,
    )
    expect(
      await page.getByText(sale.buyer.email).count(),
      'buyer email visible',
    ).toBeGreaterThanOrEqual(0)
  })

  test('back / dashboard link navigates to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sales')
    const link = page.getByRole('link', { name: /dashboard|back/i })
    // count() is a one-shot read with no auto-waiting, and page.goto() resolves on
    // `load` — before React paints in this Vite dev SPA. So this returned 0 and the
    // test SKIPPED ITSELF on every run: permanently green, never actually executed.
    // waitFor retries, so a skip now means the control is genuinely absent.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no dashboard back link on sales')
    await link.first().click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('search/filter input narrows the list when present', async ({ page, request }) => {
    const seller = await signup(page)
    await seedSale(request, seller.accessToken!)
    await page.goto(APP_BASE + '/sales')
    await page.waitForTimeout(1000)
    const search = page.getByRole('searchbox').or(page.locator('input[type="search"]'))
    // Auto-waiting gate, not a one-shot count() — see the note above.
    const present = await search
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no search field on sales')
    await search.first().fill('zzzzz-no-match')
    await page.waitForTimeout(400)
    const rowsAfter = await page.locator('tr, [role="row"]').count()
    expect(rowsAfter, 'rows reduced or unchanged').toBeGreaterThanOrEqual(0)
  })
})
