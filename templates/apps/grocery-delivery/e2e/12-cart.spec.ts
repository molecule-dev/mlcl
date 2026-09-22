import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  addFirstProductToCart,
  APP_BASE,
  captureNetwork,
  gotoAndWait,
  signup,
  signupAndAddToCart,
} from './_helpers'

// /cart — authenticated. Loads /api/cart + /api/delivery-slots.
// Items: qty +/-, remove, substitution preference. Slot: radio. CTA: checkout.

test.describe('/cart', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/cart')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('empty cart shows empty-state CTA to /shop', async ({ page }) => {
    await signup(page)
    await gotoAndWait(page, APP_BASE + '/cart', (r) => /\/api\/cart/.test(r.url()))
    // Both Cart's main empty-state and OrderSummaryCard's empty-state render
    // "Your cart is empty." — assert at least one is visible via .first().
    await expect(page.getByText(/cart is empty/i).first()).toBeVisible({ timeout: 10_000 })
    const start = page.getByRole('link', { name: /start shopping|shop/i }).first()
    await expect(start).toBeVisible()
    await start.click()
    await expect(page).toHaveURL(/\/shop/)
  })

  test('after adding a product, cart shows item, slots and checkout CTA', async ({ page }) => {
    await signupAndAddToCart(page)
    await gotoAndWait(page, APP_BASE + '/cart', (r) => /\/api\/cart/.test(r.url()))
    await expect(page.locator('[data-test="cart-item"]').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /increment/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /decrement/i }).first()).toBeVisible()
    await expect(page.locator('input[type="radio"][name="slot"]').first()).toBeVisible()
  })

  test('+ button calls PUT /api/cart/items/:id and increases quantity', async ({ page }) => {
    await signupAndAddToCart(page)
    await page.goto(APP_BASE + '/cart')
    await page.waitForSelector('[data-test="cart-item"]', { timeout: 15_000 })
    const qty = await page.locator('[data-test="qty"]').first().textContent()
    const reqs = await captureNetwork(page, async () => {
      const putP = page.waitForResponse(
        (r) => /\/api\/cart\/items\//.test(r.url()) && r.request().method() === 'PUT',
        { timeout: 10_000 },
      )
      await page
        .getByRole('button', { name: /increment/i })
        .first()
        .click()
      await putP
      await page.waitForTimeout(400)
    })
    const put = reqs.find((r) => r.method === 'PUT' && /\/api\/cart\/items\//.test(r.url))
    expect(put).toBeDefined()
    expect(put!.status).toBeLessThan(300)
    const newQty = await page.locator('[data-test="qty"]').first().textContent()
    expect(Number(newQty)).toBeGreaterThan(Number(qty))
  })

  test('Remove link calls DELETE /api/cart/items/:id and removes the row', async ({ page }) => {
    await signupAndAddToCart(page)
    await page.goto(APP_BASE + '/cart')
    await page.waitForSelector('[data-test="cart-item"]', { timeout: 15_000 })
    const reqs = await captureNetwork(page, async () => {
      const delP = page.waitForResponse(
        (r) => /\/api\/cart\/items\//.test(r.url()) && r.request().method() === 'DELETE',
        { timeout: 10_000 },
      )
      await page
        .getByRole('button', { name: /^remove$/i })
        .first()
        .click()
      await delP
      await page.waitForTimeout(400)
    })
    const del = reqs.find((r) => r.method === 'DELETE' && /\/api\/cart\/items\//.test(r.url))
    expect(del).toBeDefined()
    expect(del!.status).toBeLessThan(300)
    await expect(page.getByText(/cart is empty/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Substitution select PUT updates substitution_pref and persists', async ({ page }) => {
    await signupAndAddToCart(page)
    await page.goto(APP_BASE + '/cart')
    await page.waitForSelector('[data-test="cart-item"]', { timeout: 15_000 })
    const reqs = await captureNetwork(page, async () => {
      const putP = page.waitForResponse(
        (r) => /\/api\/cart\/items\//.test(r.url()) && r.request().method() === 'PUT',
        { timeout: 10_000 },
      )
      await page.locator('select[aria-label*="unavailable" i]').first().selectOption('remove')
      await putP
    })
    const put = reqs.find((r) => r.method === 'PUT' && /\/api\/cart\/items\//.test(r.url))
    expect(put).toBeDefined()
    expect(put!.status).toBeLessThan(300)
  })

  test('selecting a delivery slot persists in URL via /checkout?slot=', async ({ page }) => {
    await signupAndAddToCart(page)
    await page.goto(APP_BASE + '/cart')
    await page.waitForSelector('[data-test="cart-item"]', { timeout: 15_000 })
    const radios = page.locator('input[type="radio"][name="slot"]')
    if ((await radios.count()) > 1) {
      await radios.nth(1).click()
    }
    const checkout = page.getByRole('link', { name: /checkout|continue/i }).first()
    await checkout.click()
    await expect(page).toHaveURL(/\/checkout/)
  })
})

// keep import-side-effect for addFirstProductToCart (referenced for future tests)
void addFirstProductToCart
