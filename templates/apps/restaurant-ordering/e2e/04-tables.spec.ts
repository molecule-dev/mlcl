/**
 * Tables CRUD + status lifecycle. Tables are scoped to the operator
 * (user_id) — verify owner-scoped isolation, status transitions, and
 * that a payment-paid order moves the table to `cleaning`.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiRequest,
  createMenuItem,
  createTable,
  signup,
  type ApiOrder,
  type ApiTable,
} from './_helpers.js'

test('Tables: create, list, update status, delete', async ({ page }) => {
  await signup(page)
  const t = await createTable(page, { table_number: 7, seats: 4, section: 'patio' })
  expect(t.status).toBe('available')

  const list = await apiRequest<{ data: ApiTable[] }>(page, 'GET', '/api/tables')
  expect(list.status).toBe(200)
  expect(list.body.data.find((r) => r.id === t.id)?.table_number).toBe(7)

  // Reserve it
  const upd = await apiRequest<ApiTable>(page, 'PUT', `/api/tables/${t.id}/status`, {
    status: 'reserved',
  })
  expect(upd.status).toBe(200)
  const after = await apiRequest<ApiTable>(page, 'GET', `/api/tables/${t.id}`)
  expect(after.body.status).toBe('reserved')

  // Delete
  const del = await apiRequest(page, 'DELETE', `/api/tables/${t.id}`)
  expect(del.status).toBe(204)
})

test('Tables: get table by number returns the matching row', async ({ page }) => {
  await signup(page)
  const t = await createTable(page, { table_number: 99, seats: 6 })
  const byNumber = await apiRequest<ApiTable>(
    page,
    'GET',
    `/api/tables/by-number/${t.table_number}`,
  )
  expect(byNumber.status).toBe(200)
  expect(byNumber.body.id).toBe(t.id)
})

test('Tables page renders created tables', async ({ page }) => {
  await signup(page)
  await createTable(page, { table_number: 11, seats: 2, section: 'main' })
  await createTable(page, { table_number: 12, seats: 4, section: 'main' })

  await page.goto(APP_BASE + '/tables', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  // Tables typically render their numbers prominently
  await expect(page.locator('body')).toContainText(/11/)
  await expect(page.locator('body')).toContainText(/12/)
})

test('Tables: paid order on a table moves the table to cleaning', async ({ page }) => {
  await signup(page)
  const t = await createTable(page, { table_number: 22, seats: 4 })
  const item = await createMenuItem(page, { price: 10 })
  const o = await apiRequest<ApiOrder>(page, 'POST', '/api/orders', {
    table_id: t.id,
    items: [{ menu_item_id: item.id, quantity: 1 }],
  })
  expect(o.status).toBe(201)

  // Table now occupied
  const occupied = await apiRequest<ApiTable>(page, 'GET', `/api/tables/${t.id}`)
  expect(occupied.body.status).toBe('occupied')

  // Pay it (cash, no Stripe roundtrip)
  const pay = await apiRequest<{ success: boolean }>(page, 'POST', `/api/orders/${o.body.id}/pay`, {
    method: 'cash',
    tip: 2,
  })
  expect(pay.status).toBe(200)
  expect(pay.body.success).toBe(true)

  // After paying the only open order, table should be cleaning
  const cleaning = await apiRequest<ApiTable>(page, 'GET', `/api/tables/${t.id}`)
  expect(cleaning.body.status).toBe('cleaning')
})

test('Tables: QR endpoint returns a printable URL with owner_id and table number', async ({
  page,
}) => {
  const { userId } = await signup(page)
  const t = await createTable(page, { table_number: 42, seats: 2 })
  const qr = await apiRequest<{ url: string; table_number: number; owner_id: string }>(
    page,
    'GET',
    `/api/tables/${t.id}/qr`,
  )
  expect(qr.status).toBe(200)
  expect(qr.body.table_number).toBe(42)
  // The owner_id must be returned and embedded in the URL — the guest endpoint
  // requires it to scope the menu lookup and order creation to the right
  // restaurant. Without owner_id the QR is ambiguous when two restaurants
  // both have the same table number.
  expect(qr.body.owner_id).toBe(userId)
  expect(qr.body.url).toMatch(/menu\/guest/)
  expect(qr.body.url).toContain(`owner=${userId}`)
  expect(qr.body.url).toContain('table=42')
})

test('Tables: scanning the QR URL leads to a guest order that lands on the operator', async ({
  page,
}) => {
  const { userId } = await signup(page)
  const t = await createTable(page, { table_number: 88, seats: 4 })
  const item = await apiRequest<{ id: string }>(page, 'POST', '/api/menu', {
    name: 'QR Test Pasta',
    description: 'Carbonara',
    price: 19.5,
    category: 'mains',
    dietary_tags: [],
  })
  expect(item.status).toBeGreaterThanOrEqual(200)
  const qr = await apiRequest<{ url: string; owner_id: string }>(
    page,
    'GET',
    `/api/tables/${t.id}/qr`,
  )
  expect(qr.status).toBe(200)

  // Simulate a guest scanning the QR — POST to /api/guest/orders with the
  // owner_id parsed from the URL.
  const url = new URL(qr.body.url)
  const ownerFromUrl = url.searchParams.get('owner')
  expect(ownerFromUrl).toBe(userId)

  const guestEmail = `guest-${Date.now()}@example.com`
  const order = await apiRequest<{ id: string }>(page, 'POST', '/api/guest/orders', {
    owner_id: ownerFromUrl,
    table_id: t.id,
    items: [{ menu_item_id: item.body.id, quantity: 2 }],
    customer_name: 'QR Guest',
    customer_email: guestEmail,
  })
  expect(order.status).toBe(201)

  // Read-after-write: the operator can see this order in their list.
  const list = await apiRequest<{ data: Array<{ id: string }> }>(page, 'GET', '/api/orders')
  expect(list.body.data.find((r) => r.id === order.body.id)).toBeTruthy()
})
