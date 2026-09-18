import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  addFirstProductToCart,
  captureNetwork,
  promoteToAdmin,
  signup,
} from './_helpers.js'

async function authedRequest(page: import('@playwright/test').Page) {
  const cookies = await page.context().cookies()
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

test.describe('admin API', () => {
  test('GET /api/admin/stats returns numeric kpi shape after signup', async ({ page, request }) => {
    await signup(page)
    await promoteToAdmin(page)
    const cookieHeader = await authedRequest(page)
    const r = await request.get(API_BASE + '/admin/stats', {
      headers: { Cookie: cookieHeader },
    })
    expect(r.ok()).toBeTruthy()
    const body = (await r.json()) as Record<string, unknown>
    for (const key of ['orders', 'revenue', 'newCustomers', 'products', 'pending', 'completed']) {
      expect(typeof body[key]).toBe('number')
    }
    expect(Number(body.products)).toBeGreaterThan(0)
  })

  test('admin/stats unauthorized without session', async ({ request }) => {
    const r = await request.get(API_BASE + '/admin/stats')
    expect(r.status()).toBe(401)
  })

  test('placing an order increments admin orders count and revenue', async ({ page, request }) => {
    await signup(page)
    await promoteToAdmin(page)
    await addFirstProductToCart(page, 1)
    const cookieHeader = await authedRequest(page)

    const before = (await request
      .get(API_BASE + '/admin/stats', { headers: { Cookie: cookieHeader } })
      .then((r) => r.json())) as { orders: number; revenue: number }

    const create = await request.post(API_BASE + '/orders', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        shippingAddress: {
          name: 'Test Shopper',
          line1: '1 Mock St',
          city: 'Testville',
          state: 'CA',
          postalCode: '90210',
          country: 'US',
        },
        billingAddress: {
          name: 'Test Shopper',
          line1: '1 Mock St',
          city: 'Testville',
          state: 'CA',
          postalCode: '90210',
          country: 'US',
        },
        paymentMethodId: 'pm_card_visa_test',
      },
    })
    expect([200, 201]).toContain(create.status())

    const after = (await request
      .get(API_BASE + '/admin/stats', { headers: { Cookie: cookieHeader } })
      .then((r) => r.json())) as { orders: number; revenue: number }
    expect(after.orders).toBeGreaterThan(before.orders)
    expect(after.revenue).toBeGreaterThan(before.revenue)
  })

  test('admin orders endpoint hydrates customer_name', async ({ page, request }) => {
    await signup(page)
    await promoteToAdmin(page)
    await addFirstProductToCart(page, 1)
    const cookieHeader = await authedRequest(page)
    await request.post(API_BASE + '/orders', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        shippingAddress: {
          name: 'A',
          line1: 'a',
          city: 'a',
          state: 'a',
          postalCode: 'a',
          country: 'a',
        },
        billingAddress: {
          name: 'A',
          line1: 'a',
          city: 'a',
          state: 'a',
          postalCode: 'a',
          country: 'a',
        },
        paymentMethodId: 'pm_test',
      },
    })
    const r = await request.get(API_BASE + '/admin/orders?limit=10', {
      headers: { Cookie: cookieHeader },
    })
    expect(r.ok()).toBeTruthy()
    const body = (await r.json()) as {
      data: Array<{ customer_name?: string; total: number | string }>
    }
    expect(Array.isArray(body.data)).toBeTruthy()
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.data[0].customer_name).toBeTruthy()
    expect(Number(body.data[0].total)).toBeGreaterThan(0)
  })

  test('admin can cancel an order via PUT /admin/orders/:id/status', async ({ page, request }) => {
    await signup(page)
    await promoteToAdmin(page)
    await addFirstProductToCart(page, 1)
    const cookieHeader = await authedRequest(page)
    const create = await request.post(API_BASE + '/orders', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        shippingAddress: {
          name: 'A',
          line1: 'a',
          city: 'a',
          state: 'a',
          postalCode: 'a',
          country: 'a',
        },
        billingAddress: {
          name: 'A',
          line1: 'a',
          city: 'a',
          state: 'a',
          postalCode: 'a',
          country: 'a',
        },
        paymentMethodId: 'pm_test',
      },
    })
    expect([200, 201]).toContain(create.status())
    const created = (await create.json()) as { id?: string; data?: { id?: string } }
    const orderId = created.id ?? created.data?.id
    expect(orderId).toBeTruthy()

    const cancel = await request.put(API_BASE + `/admin/orders/${orderId}/status`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { status: 'cancelled' },
    })
    expect(cancel.ok()).toBeTruthy()

    const fresh = await request.get(API_BASE + `/admin/orders/${orderId}`, {
      headers: { Cookie: cookieHeader },
    })
    const body = (await fresh.json()) as { status: string }
    expect(body.status).toBe('cancelled')
  })

  test("admin restock raises a product's available stock", async ({ page, request }) => {
    await signup(page)
    await promoteToAdmin(page)
    const cookieHeader = await authedRequest(page)
    const list = (await request.get(API_BASE + '/products?limit=1').then((r) => r.json())) as {
      data: Array<{ id: string }>
    }
    const productId = list.data?.[0]?.id
    expect(productId).toBeTruthy()

    const before = (await request
      .get(API_BASE + `/products/${productId}`)
      .then((r) => r.json())) as { inventory?: { available?: number } }
    const beforeAvailable = Number(before.inventory?.available ?? 0)

    const r = await request.post(API_BASE + `/admin/products/${productId}/restock`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { quantity: 25 },
    })
    expect(r.ok()).toBeTruthy()

    const after = (await request
      .get(API_BASE + `/products/${productId}`)
      .then((r) => r.json())) as { inventory?: { available?: number } }
    expect(Number(after.inventory?.available ?? 0)).toBeGreaterThanOrEqual(beforeAvailable + 25)
  })

  test('admin low-stock returns rows with stock <= threshold', async ({ page, request }) => {
    await signup(page)
    await promoteToAdmin(page)
    const cookieHeader = await authedRequest(page)
    const r = await request.get(API_BASE + '/admin/low-stock?threshold=1000', {
      headers: { Cookie: cookieHeader },
    })
    expect(r.ok()).toBeTruthy()
    const body = (await r.json()) as { data: Array<{ stock: number }>; threshold: number }
    expect(body.threshold).toBe(1000)
    expect(Array.isArray(body.data)).toBeTruthy()
    for (const row of body.data) {
      expect(row.stock).toBeLessThanOrEqual(1000)
    }
  })

  test('GET /admin/reports/orders.csv returns CSV with the header row', async ({
    page,
    request,
  }) => {
    await signup(page)
    await promoteToAdmin(page)
    const cookieHeader = await authedRequest(page)
    const r = await request.get(API_BASE + '/admin/reports/orders.csv', {
      headers: { Cookie: cookieHeader },
    })
    expect(r.ok()).toBeTruthy()
    expect(String(r.headers()['content-type'] || '')).toContain('text/csv')
    const text = await r.text()
    expect(text.split('\n')[0]).toContain('id,user_id,status')
  })

  test('admin dashboard KPI tile shows the order count fetched from /admin/stats', async ({
    page,
    request,
  }) => {
    await signup(page)
    await promoteToAdmin(page)
    await addFirstProductToCart(page, 1)
    const cookieHeader = await authedRequest(page)
    await request.post(API_BASE + '/orders', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        shippingAddress: {
          name: 'A',
          line1: 'a',
          city: 'a',
          state: 'a',
          postalCode: 'a',
          country: 'a',
        },
        billingAddress: {
          name: 'A',
          line1: 'a',
          city: 'a',
          state: 'a',
          postalCode: 'a',
          country: 'a',
        },
        paymentMethodId: 'pm_test',
      },
    })

    const reqs = await captureNetwork(page, async () => {
      await page.goto('/admin')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/admin\/stats/.test(r.url))).toBeTruthy()
    const ordersTile = page.locator('[data-mol-id="kpi-orders-value"]')
    await expect(ordersTile).toBeVisible({ timeout: 15_000 })
    const value = Number(((await ordersTile.textContent()) ?? '').replace(/[^0-9.]/g, ''))
    expect(value).toBeGreaterThan(0)
  })

  test("admin orders page displays the user's placed order in the table", async ({
    page,
    request,
  }) => {
    await signup(page)
    await promoteToAdmin(page)
    await addFirstProductToCart(page, 1)
    const cookieHeader = await authedRequest(page)
    await request.post(API_BASE + '/orders', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        shippingAddress: {
          name: 'A',
          line1: 'a',
          city: 'a',
          state: 'a',
          postalCode: 'a',
          country: 'a',
        },
        billingAddress: {
          name: 'A',
          line1: 'a',
          city: 'a',
          state: 'a',
          postalCode: 'a',
          country: 'a',
        },
        paymentMethodId: 'pm_test',
      },
    })

    await page.goto('/admin/orders')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const tbody = page.locator('[data-mol-id="orders-tbody"]')
    await expect(tbody).toBeVisible({ timeout: 15_000 })
    const rowCount = await tbody.locator('tr').count()
    expect(rowCount).toBeGreaterThan(0)
  })
})
