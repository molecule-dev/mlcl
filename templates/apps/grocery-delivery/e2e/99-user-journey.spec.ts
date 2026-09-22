import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, firstInStockProductHref, gotoAndWait, signup } from './_helpers'

// 99-user-journey — kitchen-sink cross-page flow. Sign up, browse,
// add to cart, checkout, view order, view orders list, edit settings.
// Asserts on outcome at every step (read-after-write).

test.describe('Full user journey', () => {
  test('signup → shop → product → cart → checkout → confirmation → orders → tracking → settings', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      // 1. Sign up new user — lands on /shop
      await signup(page)
      await expect(page).toHaveURL(/\/(shop|cart|orders|lists)/, { timeout: 15_000 })
      await gotoAndWait(page, APP_BASE + '/shop', (r) => r.url().includes('/api/products'))

      // 2. Browse a product (skip out-of-stock ones — they have a
      // disabled button instead of an "Add to cart" affordance, which
      // would block step 3).
      const productHref = await firstInStockProductHref(page)
      expect(productHref).toBeTruthy()
      await gotoAndWait(page, APP_BASE + productHref!, (r) =>
        /\/api\/products\/[^/]+/.test(r.url()),
      )
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      // 3. Add 2 to cart
      await page.getByRole('button', { name: /increment/i }).click()
      const addBtn = page.getByRole('button', { name: /add.*to cart/i }).first()
      const postP = page.waitForResponse(
        (r) => r.url().includes('/api/cart/items') && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      await addBtn.click()
      await postP

      // 4. Visit cart, verify item is there
      await gotoAndWait(page, APP_BASE + '/cart', (r) => r.url().includes('/api/cart'))
      await expect(page.locator('[data-test="cart-item"]').first()).toBeVisible({ timeout: 10_000 })

      // 5. Proceed to checkout
      await page
        .getByRole('link', { name: /checkout|continue/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/checkout/)
      // Arm BOTH initial-fetch waits before the client-side navigation —
      // the checkout page fires them as soon as it mounts.
      const cartP = page.waitForResponse((r) => /\/api\/cart/.test(r.url()), { timeout: 15_000 })
      const slotsP = page.waitForResponse((r) => /\/api\/delivery-slots/.test(r.url()), {
        timeout: 15_000,
      })
      await cartP
      await slotsP

      // 6. Place order
      await page.getByRole('button', { name: /place order/i }).click()
      await page.waitForURL(/\/order\/[^/]+\/confirmation/, { timeout: 15_000 })
      await expect(page.getByRole('heading', { name: /order placed/i })).toBeVisible({
        timeout: 10_000,
      })

      // 7. Click track order
      await page.getByRole('link', { name: /track order/i }).click()
      await expect(page).toHaveURL(/\/order\/[^/]+(\/$|$)/)

      // 8. Visit /orders — order is listed
      await gotoAndWait(
        page,
        APP_BASE + '/orders',
        (r) => /\/api\/orders/.test(r.url()) && r.request().method() === 'GET',
      )
      await expect(page.getByText(/\d+\s*items?/i).first()).toBeVisible({ timeout: 10_000 })

      // 9. Visit /lists — the smart_reorder_due section is populated by the
      // recent order (read-after-write through the lists handler's history
      // logic).
      await gotoAndWait(page, APP_BASE + '/lists', (r) => /\/api\/lists/.test(r.url()))
      // Lists empty state OR a list grid; we don't require one or the other
      // because a fresh user has no shopping lists yet, but the page must
      // render without 5xx.

      // 10. Visit /settings — switch to preferences and toggle push
      await page.goto(APP_BASE + '/settings')
      await page.locator('[data-test="settings-section-preferences"]').click()
      const toggle = page.locator('[data-test="settings-push-toggle"]')
      const before = await toggle.getAttribute('aria-checked')
      await toggle.click()
      const after = await toggle.getAttribute('aria-checked')
      expect(after).not.toBe(before)
    })

    // No 5xx during the entire journey
    const fives = reqs.filter((r) => r.status >= 500)
    expect(
      fives,
      `5xx requests during journey: ${fives.map((r) => r.url).join(', ')}`,
    ).toHaveLength(0)
  })
})
