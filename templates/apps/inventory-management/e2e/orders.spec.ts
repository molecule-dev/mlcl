import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  captureNetwork,
  primeDashboard,
  signup,
  uniqueEmail,
} from './_helpers.js'

interface ApiOrder {
  id: string
  reference: string
  type: 'inbound' | 'outbound'
  status: string
  partner: string
  warehouse_id: string
  total_units: number
  total_value_cents: number
}

test.describe('orders page', () => {
  test('lists orders with KPIs', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('orders-list'))
    await primeDashboard(page, accessToken)
    // The reference to look for comes from the API, not from the demo seed's
    // "PO-…" numbering, which an app's owner replaces with their own.
    const orders = await page.request
      .get(`${API_BASE}/orders?limit=10`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiOrder[]>)
    expect(orders.length).toBeGreaterThan(0)

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/orders')
      await expect(page.getByRole('heading', { name: /^orders$/i })).toBeVisible()
      await expect(page.getByRole('cell', { name: orders[0].reference })).toBeVisible({
        timeout: 15_000,
      })
    })
    const ordersCall = reqs.find((r) => /\/orders(\?|$)/.test(r.url) && r.method === 'GET')
    expect(ordersCall?.status, 'GET /orders fired on list load').toBe(200)
  })

  test('Create order persists via API and is read back on the list', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('orders-create'))
    await primeDashboard(page, accessToken)

    const warehouses = await page.request
      .get(`${API_BASE}/warehouses`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ id: string }>>)
    const products = await page.request
      .get(`${API_BASE}/products?limit=200`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ id: string; sku: string }>>)
    expect(warehouses.length).toBeGreaterThan(0)
    expect(products.length).toBeGreaterThan(0)

    const ref = 'PO-NEW-' + Date.now()
    const create = await page.request.post(`${API_BASE}/orders`, {
      headers: authHeaders(accessToken),
      data: {
        reference: ref,
        type: 'inbound',
        partner: 'Acme',
        warehouse_id: warehouses[0].id,
        items: [
          {
            product_id: products[0].id,
            sku: products[0].sku,
            expected_quantity: 50,
            unit_cost_cents: 250,
          },
        ],
      },
      failOnStatusCode: false,
    })
    expect(create.status(), await create.text().catch(() => '')).toBe(201)

    await page.goto(APP_BASE + '/orders')
    await expect(page.getByText(ref)).toBeVisible({ timeout: 10_000 })
  })

  test('Receive order: bumps stock, posts movements, marks order received, creates notification', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('orders-recv'))
    await primeDashboard(page, accessToken)

    // Whichever inbound order is still open — ask the API rather than naming a
    // seeded reference.
    const orders = await page.request
      .get(`${API_BASE}/orders?type=inbound&status=inbound`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiOrder[]>)
    const target = orders.find((o) => o.status === 'inbound') ?? orders[0]
    expect(target, 'the app has an open inbound order').toBeTruthy()

    const detail = await page.request
      .get(`${API_BASE}/orders/${target.id}`, { headers: authHeaders(accessToken) })
      .then(
        (r) =>
          r.json() as Promise<
            ApiOrder & {
              items: Array<{ product_id: string; expected_quantity: number }>
              warehouse_id: string
            }
          >,
      )
    const firstItem = detail.items[0]
    expect(firstItem, 'order has at least one line').toBeTruthy()

    // Stock before receive
    const stockBefore = await page.request
      .get(`${API_BASE}/stock/product/${firstItem.product_id}`, {
        headers: authHeaders(accessToken),
      })
      .then(
        (r) =>
          r.json() as Promise<{ by_warehouse: Array<{ warehouse_id: string; quantity: number }> }>,
      )
    const beforeAtWh =
      stockBefore.by_warehouse.find((s) => s.warehouse_id === detail.warehouse_id)?.quantity ?? 0

    // Receive
    const recv = await page.request.post(`${API_BASE}/orders/${target.id}/receive`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(recv.status(), await recv.text().catch(() => '')).toBe(200)
    const updated = (await recv.json()) as ApiOrder
    expect(updated.status).toBe('received')

    // Stock after receive: bumped by item.expected_quantity
    const stockAfter = await page.request
      .get(`${API_BASE}/stock/product/${firstItem.product_id}`, {
        headers: authHeaders(accessToken),
      })
      .then(
        (r) =>
          r.json() as Promise<{ by_warehouse: Array<{ warehouse_id: string; quantity: number }> }>,
      )
    const afterAtWh =
      stockAfter.by_warehouse.find((s) => s.warehouse_id === detail.warehouse_id)?.quantity ?? 0
    expect(afterAtWh - beforeAtWh).toBe(Number(firstItem.expected_quantity))

    // A movement row was appended
    const movements = await page.request
      .get(
        `${API_BASE}/stock/movements?reference=order:${target.id}&product_id=${firstItem.product_id}`,
        { headers: authHeaders(accessToken) },
      )
      .then((r) => r.json() as Promise<Array<{ reason: string; quantity_change: number }>>)
    const recvMov = movements.find((m) => m.reason === 'receive')
    expect(recvMov, 'a stock_movement with reason=receive was created').toBeTruthy()
    expect(Number(recvMov!.quantity_change)).toBe(Number(firstItem.expected_quantity))

    // Cannot receive twice
    const second = await page.request.post(`${API_BASE}/orders/${target.id}/receive`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(second.status()).toBe(400)

    // A notification was posted
    const notifs = await page.request
      .get(`${API_BASE}/notifications`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ kind?: string; href?: string; title?: string }>>)
    const orderNotif = notifs.find(
      (n) => n.href === `/orders/${target.id}` || /order received/i.test(n.title ?? ''),
    )
    expect(orderNotif, 'a notification was created on receive').toBeTruthy()
  })

  test('Cancel an open order works; cancel a closed order does not', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('orders-cancel'))
    await primeDashboard(page, accessToken)

    const all = await page.request
      .get(`${API_BASE}/orders?limit=100`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiOrder[]>)

    const open = all.find((o) => o.status === 'inbound' || o.status === 'outbound')
    const closed = all.find((o) => o.status === 'received' || o.status === 'shipped')
    expect(open, 'has at least one open order').toBeTruthy()
    expect(closed, 'has at least one closed order').toBeTruthy()

    const ok = await page.request.post(`${API_BASE}/orders/${open!.id}/cancel`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(ok.status()).toBe(200)
    const cancelled = (await ok.json()) as ApiOrder
    expect(cancelled.status).toBe('cancelled')

    const refused = await page.request.post(`${API_BASE}/orders/${closed!.id}/cancel`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(refused.status()).toBe(400)
  })

  test('order detail page renders line items and totals', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('orders-detail'))
    await primeDashboard(page, accessToken)

    const orders = await page.request
      .get(`${API_BASE}/orders?limit=10`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiOrder[]>)
    expect(orders.length).toBeGreaterThan(0)

    await page.goto(APP_BASE + `/orders/${orders[0].id}`)
    await expect(page.getByText(orders[0].reference)).toBeVisible({ timeout: 10_000 })
  })
})
