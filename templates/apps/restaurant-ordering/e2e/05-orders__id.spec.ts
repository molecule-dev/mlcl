/**
 * Order lifecycle — pending → preparing → ready → served → paid. Verify
 * subtotal/total compute from menu prices, status transitions persist,
 * and a paid order writes a payment_id row that the order detail
 * reflects.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiRequest,
  createMenuItem,
  createTable,
  signup,
  type ApiOrder,
} from './_helpers.js'

test('Order subtotal computes from menu prices server-side (do not trust client)', async ({
  page,
}) => {
  await signup(page)
  const a = await createMenuItem(page, { price: 12 })
  const b = await createMenuItem(page, { price: 8.5 })
  const o = await apiRequest<ApiOrder>(page, 'POST', '/api/orders', {
    items: [
      { menu_item_id: a.id, quantity: 2 },
      { menu_item_id: b.id, quantity: 1 },
    ],
  })
  expect(o.status).toBe(201)
  expect(Number(o.body.subtotal)).toBeCloseTo(2 * 12 + 8.5, 2)
})

test('Order moves through pending → preparing → ready → served → paid', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, { price: 9.95 })
  const t = await createTable(page, { seats: 2 })
  const o = await apiRequest<ApiOrder>(page, 'POST', '/api/orders', {
    table_id: t.id,
    items: [{ menu_item_id: item.id, quantity: 1 }],
  })
  const id = o.body.id

  for (const status of ['preparing', 'ready', 'served'] as const) {
    const upd = await apiRequest<ApiOrder>(page, 'PUT', `/api/orders/${id}/status`, { status })
    expect(upd.status, `PUT status=${status}`).toBe(200)
    const fresh = await apiRequest<ApiOrder>(page, 'GET', `/api/orders/${id}`)
    expect(fresh.body.status).toBe(status)
  }

  const pay = await apiRequest<{ success: boolean; chargeAmount: number; paymentId: string }>(
    page,
    'POST',
    `/api/orders/${id}/pay`,
    { method: 'cash', tip: 1.5 },
  )
  expect(pay.status).toBe(200)
  expect(pay.body.success).toBe(true)
  expect(pay.body.paymentId).toMatch(/^cash_/)

  const final = await apiRequest<ApiOrder & { payment_id?: string }>(
    page,
    'GET',
    `/api/orders/${id}`,
  )
  expect(final.body.status).toBe('paid')
  expect(final.body.payment_id).toMatch(/^cash_/)
  expect(Number(final.body.tip)).toBeCloseTo(1.5, 2)
})

test('Order cannot be paid twice', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, { price: 5 })
  const o = await apiRequest<ApiOrder>(page, 'POST', '/api/orders', {
    items: [{ menu_item_id: item.id, quantity: 1 }],
  })
  const first = await apiRequest(page, 'POST', `/api/orders/${o.body.id}/pay`, { method: 'cash' })
  expect(first.status).toBe(200)
  const second = await apiRequest<{ error: string }>(page, 'POST', `/api/orders/${o.body.id}/pay`, {
    method: 'cash',
  })
  expect(second.status).toBe(400)
  expect(second.body.error).toMatch(/already paid/i)
})

test('Order can be cancelled', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, { price: 5 })
  const o = await apiRequest<ApiOrder>(page, 'POST', '/api/orders', {
    items: [{ menu_item_id: item.id, quantity: 1 }],
  })
  const cancel = await apiRequest<ApiOrder>(page, 'PUT', `/api/orders/${o.body.id}/status`, {
    status: 'cancelled',
  })
  expect(cancel.status).toBe(200)
  const fresh = await apiRequest<ApiOrder>(page, 'GET', `/api/orders/${o.body.id}`)
  expect(fresh.body.status).toBe('cancelled')
})

test('Order detail page renders an existing order with line items', async ({ page }) => {
  await signup(page)
  const item = await createMenuItem(page, { name: 'Lobster Roll', price: 26 })
  const o = await apiRequest<ApiOrder>(page, 'POST', '/api/orders', {
    items: [{ menu_item_id: item.id, quantity: 2 }],
  })
  await page.goto(APP_BASE + '/orders/' + o.body.id, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Lobster Roll').first()).toBeVisible({ timeout: 15000 })
})
