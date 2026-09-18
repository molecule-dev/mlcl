/**
 * End-to-end user journey: an operator signs up, builds their floor plan
 * and menu, prints a QR for table 5, accepts a guest order, runs the
 * order through the kitchen statuses, charges the tab, and verifies
 * analytics + customer history reflect the night.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { apiRequest, createMenuItem, createTable, signup } from './_helpers.js'

interface ApiOrder {
  id: string
  status: string
  subtotal: string | number
  total: string | number
  payment_id?: string | null
}

test('Owner runs a complete dinner service: signup → menu → table → guest order → kitchen → pay → analytics', async ({
  page,
  request,
}) => {
  // 1. Sign up the operator
  const owner = await signup(page)
  expect(owner.userId).toBeTruthy()

  // 2. Build menu (3 items)
  const espresso = await createMenuItem(page, { name: 'Espresso', price: 4 })
  const tagliatelle = await createMenuItem(page, { name: 'Tagliatelle', price: 21 })
  const tiramisu = await createMenuItem(page, { name: 'Tiramisu', price: 9 })

  // 3. Build floor plan (3 tables)
  const t1 = await createTable(page, { table_number: 1, seats: 2 })
  await createTable(page, { table_number: 2, seats: 4 })
  await createTable(page, { table_number: 3, seats: 6 })

  // 4. Print QR for table 1 (verify it contains a real menu/guest URL)
  const qr = await apiRequest<{ url: string }>(page, 'GET', `/api/tables/${t1.id}/qr`)
  expect(qr.status).toBe(200)
  expect(qr.url).toBeUndefined // not in response payload key
  expect(qr.body.url).toMatch(/menu\/guest/)

  // 5. A guest at table 1 submits an order via the public guest endpoint
  const guestEmail = 'guest-' + Date.now() + '@test.local'
  const guestPost = await request.post('/api/guest/orders', {
    data: {
      owner_id: owner.userId,
      table_number: 1,
      customer_name: 'Sarah Khan',
      customer_email: guestEmail,
      items: [
        { menu_item_id: espresso.id, quantity: 2 },
        { menu_item_id: tagliatelle.id, quantity: 1 },
        { menu_item_id: tiramisu.id, quantity: 1 },
      ],
    },
  })
  expect(guestPost.status()).toBe(201)
  const guestOrder = (await guestPost.json()) as { id: string; total: number }
  expect(guestOrder.id).toBeTruthy()
  // 2*4 + 21 + 9 = 38
  expect(Number(guestOrder.total)).toBeCloseTo(38, 2)

  // 6. The operator's kitchen sees the new order
  const kitchen = await apiRequest<{ data: ApiOrder[] }>(page, 'GET', '/api/kitchen')
  expect(kitchen.status).toBe(200)
  expect(kitchen.body.data.find((o) => o.id === guestOrder.id)).toBeTruthy()

  // 7. Run the order through the kitchen lifecycle
  for (const status of ['preparing', 'ready', 'served'] as const) {
    const upd = await apiRequest(page, 'PUT', `/api/orders/${guestOrder.id}/status`, { status })
    expect(upd.status).toBe(200)
  }

  // 8. Charge the tab — cash, $5 tip
  const pay = await apiRequest<{ success: boolean; chargeAmount: number; paymentId: string }>(
    page,
    'POST',
    `/api/orders/${guestOrder.id}/pay`,
    { method: 'cash', tip: 5 },
  )
  expect(pay.status).toBe(200)
  expect(pay.body.success).toBe(true)
  expect(pay.body.chargeAmount).toBeCloseTo(43, 2)

  // 9. Order ledger shows the paid order
  const final = await apiRequest<ApiOrder>(page, 'GET', `/api/orders/${guestOrder.id}`)
  expect(final.body.status).toBe('paid')
  expect(final.body.payment_id).toMatch(/^cash_/)

  // 10. Table 1 is now in the cleaning state (empty of open orders)
  const tFresh = await apiRequest<{ status: string }>(page, 'GET', `/api/tables/${t1.id}`)
  expect(tFresh.body.status).toBe('cleaning')

  // 11. Analytics snapshot reflects the revenue
  const snap = await apiRequest<{
    todayRevenueCents: number
    coversCount: number
    topItems: { name: string; sold: number }[]
  }>(page, 'GET', '/api/analytics/snapshot')
  expect(snap.status).toBe(200)
  expect(snap.body.todayRevenueCents).toBeGreaterThanOrEqual(3800)
  expect(snap.body.topItems.find((t) => t.name === 'Espresso')?.sold).toBeGreaterThanOrEqual(2)

  // 12. Customer record was created and is visible in the directory
  const customers = await apiRequest<{ data: { name: string; email: string }[] }>(
    page,
    'GET',
    '/api/customers',
  )
  expect(customers.body.data.find((c) => c.email === guestEmail)?.name).toBe('Sarah Khan')
})
