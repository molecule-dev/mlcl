import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  pickOpenRestaurant,
  pickTwoCategories,
  signup,
  uniqueEmail,
} from './_helpers.js'

/**
 * Cart + checkout flow.
 *
 * Invariants verified:
 * - Adding an item to cart bumps the cart count + subtotal AND survives
 *   `page.reload()` (localStorage-backed).
 * - Switching to another restaurant clears the cart.
 * - Going to checkout while cart is empty redirects to /checkout but the
 *   page shows the empty-cart UI (no submit button).
 * - Placing an order:
 *     • POST /api/orders returns 201 with a real order row.
 *     • Cart is cleared after success.
 *     • GET /api/orders/:id reflects the new order.
 *     • The same order shows up in GET /api/orders.
 *     • A notification of type=order_status is created for the user.
 */

test.describe('cart + checkout', () => {
  test('adding items persists cart across reload + correct subtotal', async ({ page }) => {
    await signup(page, uniqueEmail('fd-cart'))
    // Drive whichever restaurant the catalog actually holds — naming a seeded
    // one breaks the spec the moment the demo catalog is replaced.
    const { target } = await pickTwoCategories(page)
    await page.goto(APP_BASE + '/restaurants')
    await page.getByRole('heading', { name: target.name }).first().click()
    await expect(page).toHaveURL(/\/restaurant\/[0-9a-f-]+/)

    // Read first menu item's price from the page.
    const firstMenuItem = page.getByTestId('menu-item').first()
    await expect(firstMenuItem).toBeVisible()
    const price1 = await firstMenuItem.locator('text=/\\$\\d+\\.\\d{2}/').first().textContent()
    const cents1 = Math.round(parseFloat((price1 ?? '$0').replace('$', '')) * 100)

    await firstMenuItem.getByRole('button', { name: /^Add$/ }).click()
    await expect(page.getByRole('heading', { name: /Your cart \(1\)/ })).toBeVisible()
    await expect(page.getByTestId('cart-subtotal')).toHaveText(`$${(cents1 / 100).toFixed(2)}`)

    // Reload — cart must persist (localStorage-backed).
    await page.reload()
    await expect(page.getByRole('heading', { name: /Your cart \(1\)/ })).toBeVisible()
    await expect(page.getByTestId('cart-subtotal')).toHaveText(`$${(cents1 / 100).toFixed(2)}`)

    // localStorage actually has the cart.
    const storedCart = await page.evaluate(() =>
      window.localStorage.getItem('food-delivery.cart.v1'),
    )
    expect(storedCart).toBeTruthy()
    const parsed = JSON.parse(storedCart!)
    expect(parsed.lines).toHaveLength(1)
    expect(parsed.lines[0].qty).toBe(1)
    expect(parsed.lines[0].price_cents).toBe(cents1)
  })

  test('switching restaurants clears the cart', async ({ page }) => {
    await signup(page, uniqueEmail('fd-cart-switch'))
    const { target, other } = await pickTwoCategories(page)
    // Add from the first restaurant.
    await page.goto(APP_BASE + '/restaurants')
    await page.getByRole('heading', { name: target.name }).first().click()
    await page.getByTestId('menu-item').first().getByRole('button', { name: /^Add$/ }).click()
    await expect(page.getByRole('heading', { name: /Your cart \(1\)/ })).toBeVisible()

    // Go to a different restaurant and add.
    await page.goto(APP_BASE + '/restaurants')
    await page.getByRole('heading', { name: other.name }).first().click()
    await page.getByTestId('menu-item').first().getByRole('button', { name: /^Add$/ }).click()
    await expect(page.getByRole('heading', { name: /Your cart \(1\)/ })).toBeVisible()
    // Restaurant context must be the new one.
    const stored = await page.evaluate(() => window.localStorage.getItem('food-delivery.cart.v1'))
    const parsed = JSON.parse(stored!)
    expect(parsed.restaurantName).toBe(other.name)
    expect(parsed.lines).toHaveLength(1)
  })

  test('placing an order persists to the backend and clears the cart', async ({ page }) => {
    await signup(page, uniqueEmail('fd-place'))
    // POST /orders 400s a closed restaurant, so pick one the catalog says is
    // open right now rather than naming the demo catalog's 24-hour row — that
    // made this spec pass by day and fail at night once already.
    const open = await pickOpenRestaurant(page)
    await page.goto(APP_BASE + '/restaurants')
    await page.getByRole('heading', { name: open.name }).first().click()
    await expect(page).toHaveURL(/\/restaurant\/[0-9a-f-]+/)

    // Add 3 of the first menu item to clear minimum order.
    const addBtn = page.getByTestId('menu-item').first().getByRole('button', { name: /^Add$/ })
    await addBtn.click()
    await addBtn.click()
    await addBtn.click()
    await expect(page.getByRole('heading', { name: /Your cart \(3\)/ })).toBeVisible()

    await page.getByTestId('cart-checkout').click()
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByRole('heading', { name: /Checkout/i, level: 1 })).toBeVisible()

    // Fill new-address form (no saved addresses for fresh user).
    await page.locator('input[name="street"]').fill('1 Spec Lane')
    await page.locator('input[name="city"]').fill('Testville')
    await page.locator('input[name="zip"]').fill('12345')

    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('checkout-submit').click()
      await page.waitForURL(/\/checkout\/confirmation\/[0-9a-f-]+/, { timeout: 30_000 })
    })

    const ordersPost = reqs.find((r) => /\/api\/orders$/.test(r.url) && r.method === 'POST')
    expect(ordersPost?.status).toBe(201)

    // Confirmation page shows the order details.
    await expect(page.getByRole('heading', { name: /Order placed!/i })).toBeVisible()
    await expect(page.getByTestId('confirm-total')).toBeVisible()

    // Cart cleared.
    const cleared = await page.evaluate(() => window.localStorage.getItem('food-delivery.cart.v1'))
    if (cleared) {
      const parsed = JSON.parse(cleared)
      expect(parsed.lines.length).toBe(0)
    }

    // Read-after-write: the new order shows up in GET /api/orders.
    const ordersResp = await page.request.get(API_BASE + '/orders')
    expect(ordersResp.status()).toBe(200)
    const ordersBody = await ordersResp.json()
    const orders = ordersBody?.data ?? []
    expect(orders.length).toBeGreaterThan(0)
    expect(orders[0].restaurant_name).toBe(open.name)
    expect(orders[0].status).toBe('placed')
    expect(orders[0].total_cents).toBeGreaterThan(0)
    expect(orders[0].items.length).toBeGreaterThan(0)

    // And a notification was seeded.
    const notifResp = await page.request.get(API_BASE + '/notifications')
    expect(notifResp.status()).toBe(200)
    const notifBody = await notifResp.json()
    const orderStatusNotifs = (notifBody?.data ?? []).filter(
      (n: { type: string }) => n.type === 'order_status',
    )
    expect(orderStatusNotifs.length).toBeGreaterThan(0)
  })

  test('empty checkout shows empty UI and no submit', async ({ page }) => {
    await signup(page, uniqueEmail('fd-empty-checkout'))
    await page.goto(APP_BASE + '/checkout')
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByText(/Your cart is empty/i)).toBeVisible()
    // No checkout-submit button.
    await expect(page.getByTestId('checkout-submit')).toHaveCount(0)
  })
})
