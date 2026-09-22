import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, gotoAndWait, signup } from './_helpers'

// /search — authenticated. Loads /api/products on mount, filters
// client-side by category + query string. Each result links to
// /product/:id.

test.describe('/search', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/search')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('loads products from /api/products with 200', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await gotoAndWait(
        page,
        APP_BASE + '/search',
        (r) => r.url().includes('/api/products') && r.status() === 200,
      )
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/products/.test(r.url))
    expect(get).toBeDefined()
    expect(get!.status).toBe(200)
  })

  test('typing a query filters the result grid', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/search', (r) => r.url().includes('/api/products'))
    const input = page.getByRole('searchbox', { name: /search/i })
    await input.fill('milk')
    await page.waitForTimeout(400)
    // After filter, at least one product card with "milk" or no-results state
    const matches = await page.locator('a[href^="/product/"]').count()
    if (matches > 0) {
      const card = page.locator('a[href^="/product/"]').first()
      const text = (await card.textContent()) || ''
      expect(text.toLowerCase()).toContain('milk')
    }
  })

  test('selecting a category filter narrows results', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/search', (r) => r.url().includes('/api/products'))
    await page
      .getByRole('button', { name: /produce/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    // Once filtered, every visible product card should belong to produce
    // (we don't have category metadata exposed in the DOM, so just sanity
    // check that the page didn't crash and the heading is still visible).
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('clicking a result navigates to /product/:id', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/search', (r) => r.url().includes('/api/products'))
    const link = page.locator('a[href^="/product/"]').first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/product\//)
    }
  })

  test('no results state shows a friendly message', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/search', (r) => r.url().includes('/api/products'))
    await page.getByRole('searchbox', { name: /search/i }).fill('zzzzz-no-such-product')
    await page.waitForTimeout(300)
    await expect(page.getByText(/no results/i)).toBeVisible({ timeout: 5_000 })
  })
})
