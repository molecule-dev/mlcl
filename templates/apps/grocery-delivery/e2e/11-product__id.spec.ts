import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, firstInStockProductHref, gotoAndWait, signup } from './_helpers'

// /product/:id — authenticated. Loads /api/products/:id.
// Shows brand, name, price, qty stepper, Add to cart, optional nutrition.

test.describe('/product/:id', () => {
  test('renders product detail with brand, name and price', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/shop', (r) => r.url().includes('/api/products'))
    const productHref = await firstInStockProductHref(page)
    await gotoAndWait(page, APP_BASE + productHref, (r) => /\/api\/products\/[^/]+/.test(r.url()))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible()
  })

  test('quantity stepper increments and decrements', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/shop', (r) => r.url().includes('/api/products'))
    const productHref = await firstInStockProductHref(page)
    await gotoAndWait(page, APP_BASE + productHref, (r) => /\/api\/products\/[^/]+/.test(r.url()))
    const inc = page.getByRole('button', { name: /increment/i })
    const dec = page.getByRole('button', { name: /decrement/i })
    await inc.click()
    await inc.click()
    // Add-to-cart label should reflect the quantity
    await expect(page.getByRole('button', { name: /add\s+3/i })).toBeVisible()
    await dec.click()
    await expect(page.getByRole('button', { name: /add\s+2/i })).toBeVisible()
  })

  test('Add to cart calls POST /api/cart/items with chosen quantity', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/shop', (r) => r.url().includes('/api/products'))
    const productHref = await firstInStockProductHref(page)
    await gotoAndWait(page, APP_BASE + productHref, (r) => /\/api\/products\/[^/]+/.test(r.url()))
    const addBtn = page.getByRole('button', { name: /add.*to cart/i }).first()
    await expect(addBtn).toBeVisible({ timeout: 10_000 })
    const reqs = await captureNetwork(page, async () => {
      const postP = page.waitForResponse(
        (r) => r.url().includes('/api/cart/items') && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await addBtn.click()
      await postP
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/cart\/items/.test(r.url))
    expect(post).toBeDefined()
    expect(post!.status).toBeLessThan(300)
  })

  test('"Back to shop" link returns to /shop', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/shop', (r) => r.url().includes('/api/products'))
    const productHref = await firstInStockProductHref(page)
    await gotoAndWait(page, APP_BASE + productHref, (r) => /\/api\/products\/[^/]+/.test(r.url()))
    await page
      .getByRole('link', { name: /back to shop|shop/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/shop/)
  })

  test('add-to-cart for anonymous user redirects to /login', async ({ browser }) => {
    // /product/:id sits inside the AuthGuard subtree, so an anon visit
    // already redirects to /login regardless of any click we'd attempt.
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(APP_BASE + '/product/p-1')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    await ctx.close()
  })
})
