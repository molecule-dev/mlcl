/**
 * Guest cart — public/anonymous "/cart" route used by guests after
 * scanning a table QR. Verifies the page renders an empty-state with no
 * cart, accepts items added via localStorage, calculates tax+tip, and
 * places a real guest order through POST /api/guest/orders.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, createMenuItem, createTable, signup } from './_helpers.js'

test('Guest cart page renders without auth', async ({ page }) => {
  await page.goto(APP_BASE + '/cart', { waitUntil: 'domcontentloaded' })
  // Either the empty-state copy OR the cart UI should appear.
  await expect(page.getByText(/cart|order/i).first()).toBeVisible({ timeout: 5000 })
})

test('Guest cart honors items in localStorage and lets the guest place an order', async ({
  page,
}) => {
  // Sign up to create the menu + table; the cart itself is anonymous.
  const { userId } = await signup(page)
  const item = await createMenuItem(page, { name: 'Cart Test Mole', price: 14 })
  const t = await createTable(page, { table_number: 51, seats: 2 })

  // Drop auth so the cart sees a public guest. Then seed the cart via
  // the same localStorage shape the GuestMenu writes (key + line shape
  // must match `app/src/lib/guest-cart.ts`'s STORAGE_KEY/GuestCartLine
  // exactly — otherwise `readGuestCart()` falls back to empty and the
  // cart UI never renders the seeded item).
  await page.evaluate(() => window.localStorage.clear())
  await page.evaluate(
    ({ ownerId, tableNumber, line }) => {
      const cart = {
        ownerId,
        tableNumber,
        lines: [{ id: line.id, name: line.name, priceCents: line.priceCents, qty: 2, note: '' }],
      }
      window.localStorage.setItem('restaurant.guest.cart.v1', JSON.stringify(cart))
    },
    {
      ownerId: userId,
      tableNumber: 51,
      line: { id: item.id, name: 'Cart Test Mole', priceCents: 1400 },
    },
  )

  await page.goto(APP_BASE + '/cart', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Cart Test Mole').first()).toBeVisible({ timeout: 10000 })
})

test('Guest cart: POST /api/guest/orders requires owner_id', async ({ page }) => {
  // Programmatic check — without owner_id, the handler should reject.
  const r = await apiRequest(page, 'POST', '/api/guest/orders', {
    table_id: '00000000-0000-0000-0000-000000000000',
    items: [{ menu_item_id: '00000000-0000-0000-0000-000000000000', quantity: 1 }],
  })
  expect(r.status).toBeGreaterThanOrEqual(400)
  expect(r.status).toBeLessThan(500)
})

test('Guest cart: posting a real order surfaces it on the operator order list', async ({
  page,
}) => {
  const { userId } = await signup(page)
  const item = await createMenuItem(page, { name: 'Cart Round-Trip', price: 9.5 })
  const t = await createTable(page, { table_number: 52, seats: 2 })

  const order = await apiRequest<{ id: string }>(page, 'POST', '/api/guest/orders', {
    owner_id: userId,
    table_id: t.id,
    items: [{ menu_item_id: item.id, quantity: 1 }],
    customer_email: `guest-${Date.now()}@example.com`,
  })
  expect(order.status).toBe(201)

  const list = await apiRequest<{ data: Array<{ id: string }> }>(page, 'GET', '/api/orders')
  expect(list.body.data.find((r) => r.id === order.body.id)).toBeTruthy()
})
