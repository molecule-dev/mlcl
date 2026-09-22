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
  status: 'inbound' | 'outbound' | 'received' | 'shipped' | 'cancelled'
  items: Array<{ id: string; sku: string; expected_quantity: number; unit_cost_cents: number }>
  partner: string
  warehouse_id: string
  created_at?: string
}

async function fetchOpenOrder(page: import('@playwright/test').Page, accessToken: string | null) {
  const all = await page.request
    .get(`${API_BASE}/orders?limit=100`, { headers: authHeaders(accessToken) })
    .then((r) => r.json() as Promise<ApiOrder[]>)
  const open = all.find((o) => o.status === 'inbound' || o.status === 'outbound')
  expect(open, 'an open seed order is available').toBeTruthy()
  return open!
}

test.describe('order detail page', () => {
  test('renders order header, line items, totals from real API data', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('order-render'))
    await primeDashboard(page, accessToken)
    const summary = await fetchOpenOrder(page, accessToken)
    // The list endpoint omits items; pull full detail before computing the subtotal.
    const detail = await page.request
      .get(`${API_BASE}/orders/${summary.id}`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiOrder>)
    expect(detail.items?.length, 'order has at least one line item').toBeGreaterThan(0)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/orders/${detail.id}`)
      await expect(page.getByRole('heading', { name: detail.reference })).toBeVisible({
        timeout: 15_000,
      })
    })
    const orderCall = reqs.find((r) => r.url.includes(`/orders/${detail.id}`) && r.method === 'GET')
    expect(orderCall?.status, 'GET /orders/:id fired on detail load').toBe(200)
    await expect(page.getByText(/Line items/i)).toBeVisible()
    const skuCell = page.locator('table tbody tr td').first()
    await expect(skuCell).toBeVisible()
    const subtotal = detail.items.reduce(
      (s, i) => s + Number(i.expected_quantity) * Number(i.unit_cost_cents),
      0,
    )
    const expectedDollar =
      '$' + (subtotal / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })
    await expect(page.getByText(expectedDollar).first()).toBeVisible()
  })

  test('back link navigates to /orders', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('order-back'))
    await primeDashboard(page, accessToken)
    const order = await fetchOpenOrder(page, accessToken)
    await page.goto(APP_BASE + `/orders/${order.id}`)
    await page
      .getByRole('link', { name: /All orders/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/orders$/)
  })

  test('Mark received button hits POST /orders/:id/receive and updates status badge', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('order-receive'))
    await primeDashboard(page, accessToken)
    // find an open INBOUND order so the button reads "Mark received"
    const all = await page.request
      .get(`${API_BASE}/orders?type=inbound&status=inbound`, {
        headers: authHeaders(accessToken),
      })
      .then((r) => r.json() as Promise<ApiOrder[]>)
    const target = all[0]
    expect(target, 'open inbound order seeded').toBeTruthy()
    await page.goto(APP_BASE + `/orders/${target.id}`)
    await expect(page.getByRole('heading', { name: target.reference })).toBeVisible()
    await page.getByRole('button', { name: /Mark received/i }).click()
    // wait for the receive button to disappear, indicating the optimistic UI
    // has flipped through the real backend response (load() refetches on success)
    await expect(page.getByRole('button', { name: /Mark received/i })).toHaveCount(0, {
      timeout: 15_000,
    })
    // Status pill flips to "Received" — match anywhere on the page.
    await expect(page.getByText(/^Received$/i).first()).toBeVisible({ timeout: 10_000 })

    // Read-after-write via API: the order's status is now `received` and a
    // receive movement was recorded. This proves the click hit the real
    // backend, not just a UI optimistic update.
    const after = await page.request
      .get(`${API_BASE}/orders/${target.id}`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiOrder>)
    expect(after.status).toBe('received')

    // Receive button should disappear once order is closed
    await expect(page.getByRole('button', { name: /Mark received/i })).toHaveCount(0)
  })

  test('Cancel order: confirms then hits POST /orders/:id/cancel', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('order-cancel'))
    await primeDashboard(page, accessToken)
    const order = await fetchOpenOrder(page, accessToken)
    await page.goto(APP_BASE + `/orders/${order.id}`)
    await expect(page.getByRole('heading', { name: order.reference })).toBeVisible()
    page.once('dialog', (d) => void d.accept())
    await page.getByRole('button', { name: /Cancel order/i }).click()
    // Cancel button disappears once the load() refetch settles.
    await expect(page.getByRole('button', { name: /Cancel order/i })).toHaveCount(0, {
      timeout: 15_000,
    })
    await expect(page.getByText(/^Cancelled$/i).first()).toBeVisible({ timeout: 10_000 })
    // Read-after-write — the order is now cancelled in the database.
    const after = await page.request
      .get(`${API_BASE}/orders/${order.id}`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiOrder>)
    expect(after.status).toBe('cancelled')
  })

  test('terminal-status order does not render Mark/ Cancel buttons', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('order-terminal'))
    await primeDashboard(page, accessToken)
    // mark an order received via API first
    const open = await fetchOpenOrder(page, accessToken)
    const recv = await page.request.post(`${API_BASE}/orders/${open.id}/receive`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(recv.status()).toBe(200)
    await page.goto(APP_BASE + `/orders/${open.id}`)
    await expect(page.getByRole('heading', { name: open.reference })).toBeVisible()
    await expect(page.getByRole('button', { name: /Mark received|Cancel order/i })).toHaveCount(0)
  })

  test('non-existent order shows the not-found alert + back-to-orders link', async ({ page }) => {
    // The missing order 404s from the API — the rejected fetch IS the
    // not-found contract under test, so allow its expected console error.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await signup(page, uniqueEmail('order-404'))
    await page.goto(APP_BASE + `/orders/00000000-0000-0000-0000-000000000000`)
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Back to orders/i).first()).toBeVisible()
  })

  test('audit trail timeline includes the "Order created" entry', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('order-audit'))
    await primeDashboard(page, accessToken)
    const order = await fetchOpenOrder(page, accessToken)
    await page.goto(APP_BASE + `/orders/${order.id}`)
    await expect(page.getByText(/Order created/i)).toBeVisible({ timeout: 10_000 })
  })
})
