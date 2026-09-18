import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  captureNetwork,
  pickTransferRoute,
  primeDashboard,
  signup,
  uniqueEmail,
} from './_helpers.js'

interface ApiTransfer {
  id: string
  from_warehouse_id: string
  to_warehouse_id: string
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled'
}

/** Raise a pending transfer through the API the page posts to, so the list has
 *  a row to render without depending on the demo seed shipping one. */
async function createPendingTransfer(
  page: Parameters<typeof primeDashboard>[0],
  accessToken: string | null,
): Promise<ApiTransfer> {
  const { product, from, to, quantity } = await pickTransferRoute(page, accessToken)
  const res = await page.request.post(`${API_BASE}/transfers`, {
    headers: authHeaders(accessToken),
    data: {
      from_warehouse_id: from.id,
      to_warehouse_id: to.id,
      notes: 'spec transfer',
      items: [{ product_id: product.id, quantity }],
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(201)
  return (await res.json()) as ApiTransfer
}

test.describe('stock transfers page', () => {
  test('renders a pending transfer with status and warehouse selectors', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('xfer-list'))
    await primeDashboard(page, accessToken)
    await createPendingTransfer(page, accessToken)

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/transfers')
      await expect(page.getByTestId('transfers-create')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId('transfer-row').first()).toBeVisible()
    })
    await expect(page.getByTestId('transfer-status').first()).toHaveAttribute(
      'data-status',
      /pending|completed|cancelled/,
    )
    const transfersCall = reqs.find((r) => /\/transfers(\?|$)/.test(r.url) && r.method === 'GET')
    const productsCall = reqs.find((r) => /\/products(\?|$)/.test(r.url) && r.method === 'GET')
    const warehousesCall = reqs.find((r) => /\/warehouses(\?|$)/.test(r.url) && r.method === 'GET')
    expect(transfersCall?.status, 'GET /transfers fired').toBe(200)
    expect(productsCall?.status, 'GET /products fired').toBe(200)
    expect(warehousesCall?.status, 'GET /warehouses fired').toBe(200)
  })

  test('Create transfer via API moves stock from source to dest on completion', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('xfer-create'))
    await primeDashboard(page, accessToken)

    // Which product moves between which warehouses, and how much of it, is read
    // from live stock — naming seeded warehouses/SKUs breaks on a real catalog.
    const { product, from, to, quantity } = await pickTransferRoute(page, accessToken)
    expect(quantity).toBeGreaterThan(0)

    const stockBefore = await page.request
      .get(`${API_BASE}/stock/product/${product.id}`, {
        headers: authHeaders(accessToken),
      })
      .then(
        (r) =>
          r.json() as Promise<{ by_warehouse: Array<{ warehouse_id: string; quantity: number }> }>,
      )
    const fromBefore =
      stockBefore.by_warehouse.find((s) => s.warehouse_id === from.id)?.quantity ?? 0
    const toBefore = stockBefore.by_warehouse.find((s) => s.warehouse_id === to.id)?.quantity ?? 0
    expect(fromBefore).toBeGreaterThanOrEqual(quantity)

    const created = await page.request.post(`${API_BASE}/transfers`, {
      headers: authHeaders(accessToken),
      data: {
        from_warehouse_id: from.id,
        to_warehouse_id: to.id,
        notes: 'spec transfer',
        items: [{ product_id: product.id, quantity }],
      },
      failOnStatusCode: false,
    })
    expect(created.status(), await created.text().catch(() => '')).toBe(201)
    const transfer = (await created.json()) as ApiTransfer
    expect(transfer.status).toBe('pending')

    // Complete moves stock
    const complete = await page.request.post(`${API_BASE}/transfers/${transfer.id}/complete`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(complete.status(), await complete.text().catch(() => '')).toBe(200)
    const completed = (await complete.json()) as ApiTransfer
    expect(completed.status).toBe('completed')

    const stockAfter = await page.request
      .get(`${API_BASE}/stock/product/${product.id}`, {
        headers: authHeaders(accessToken),
      })
      .then(
        (r) =>
          r.json() as Promise<{ by_warehouse: Array<{ warehouse_id: string; quantity: number }> }>,
      )
    const fromAfter = stockAfter.by_warehouse.find((s) => s.warehouse_id === from.id)?.quantity ?? 0
    const toAfter = stockAfter.by_warehouse.find((s) => s.warehouse_id === to.id)?.quantity ?? 0
    expect(fromBefore - fromAfter).toBe(quantity)
    expect(toAfter - toBefore).toBe(quantity)
  })

  test('Refuses transfer with insufficient stock', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('xfer-insuf'))
    await primeDashboard(page, accessToken)

    const warehouses = await page.request
      .get(`${API_BASE}/warehouses`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ id: string; name: string }>>)
    const products = await page.request
      .get(`${API_BASE}/products?limit=200`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ id: string; sku: string }>>)
    const a = warehouses[0]
    const b = warehouses[1]
    const product = products[0]
    const tooMuch = await page.request.post(`${API_BASE}/transfers`, {
      headers: authHeaders(accessToken),
      data: {
        from_warehouse_id: a.id,
        to_warehouse_id: b.id,
        items: [{ product_id: product.id, quantity: 1_000_000 }],
      },
      failOnStatusCode: false,
    })
    expect(tooMuch.status()).toBe(400)
  })

  test('Refuses same-source-and-dest transfer', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('xfer-same'))
    await primeDashboard(page, accessToken)
    const warehouses = await page.request
      .get(`${API_BASE}/warehouses`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ id: string }>>)
    const products = await page.request
      .get(`${API_BASE}/products?limit=200`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<Array<{ id: string }>>)
    const a = warehouses[0]
    const same = await page.request.post(`${API_BASE}/transfers`, {
      headers: authHeaders(accessToken),
      data: {
        from_warehouse_id: a.id,
        to_warehouse_id: a.id,
        items: [{ product_id: products[0].id, quantity: 1 }],
      },
      failOnStatusCode: false,
    })
    expect(same.status()).toBe(400)
  })

  test('UI: Cancel button on a pending transfer flips its status to cancelled', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('xfer-ui-cancel'))
    await primeDashboard(page, accessToken)
    await createPendingTransfer(page, accessToken)

    await page.goto(APP_BASE + '/transfers')
    const cancelBtn = page.getByTestId('transfer-cancel-button').first()
    await expect(cancelBtn).toBeVisible({ timeout: 15_000 })
    await cancelBtn.click()
    // After click + reload of the list, the first transfer's badge should reflect cancelled
    // (the list reloads via load() on success)
    await expect
      .poll(
        async () => {
          const states = await page
            .getByTestId('transfer-status')
            .evaluateAll((els) =>
              els.map((el) => (el as HTMLElement).getAttribute('data-status') ?? ''),
            )
          return states.includes('cancelled')
        },
        { timeout: 10_000 },
      )
      .toBeTruthy()

    // API confirms
    const after = await page.request
      .get(`${API_BASE}/transfers`, { headers: authHeaders(accessToken) })
      .then((r) => r.json() as Promise<ApiTransfer[]>)
    expect(after.some((t) => t.status === 'cancelled')).toBeTruthy()
  })
})
