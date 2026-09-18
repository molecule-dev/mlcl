import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, addFirstProductToCart, captureNetwork, signup } from './_helpers.js'

test.describe('/orders', () => {
  test('orders page renders for signed-in user', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/orders')
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/orders/.test(r.url) && r.method === 'GET')).toBeTruthy()
    await expect(page).toHaveURL(/\/orders/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('order creation API: POST /api/orders creates an order from a cart', async ({
    page,
    request,
  }) => {
    await signup(page)
    await addFirstProductToCart(page, 1)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const create = await request.post(API_BASE + '/orders', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        shippingAddress: {
          name: 'Test Shopper',
          line1: '123 Main St',
          line2: '',
          city: 'Fairview',
          state: 'CA',
          postalCode: '94105',
          country: 'US',
        },
      },
    })
    expect(
      create.status(),
      `POST /api/orders body=${await create.text().catch(() => '')}`,
    ).toBeGreaterThanOrEqual(200)
    expect(create.status()).toBeLessThan(300)
    const body = (await create.json()) as {
      id?: string
      data?: { id?: string }
      total?: string | number
      tax?: string | number
      subtotal?: string | number
    }
    const orderId = body.id ?? body.data?.id
    expect(orderId).toBeTruthy()

    // Read-after-write: GET /api/orders/:id returns the placed order and
    // the shipping address we sent (proves persistence + payload accepted).
    const detail = await request.get(API_BASE + '/orders/' + orderId, {
      headers: { Cookie: cookieHeader },
    })
    expect(detail.status()).toBe(200)
    const order = (await detail.json()) as {
      id?: string
      shipping_address?: Record<string, unknown>
      items?: unknown[]
      total?: string | number
      tax?: string | number
      subtotal?: string | number
    }
    expect(order.id).toBe(orderId)
    expect(order.shipping_address?.city).toBe('Fairview')
    expect(order.shipping_address?.postalCode).toBe('94105')
    expect(Array.isArray(order.items) ? order.items.length : 0).toBeGreaterThan(0)
    // Tax must round-trip: the cart UI shows 8% so the saved order must
    // also reflect a non-zero tax (parseFloat handles "2784.0000" string).
    const tax = parseFloat(String(order.tax ?? '0'))
    const subtotal = parseFloat(String(order.subtotal ?? '0'))
    expect(subtotal).toBeGreaterThan(0)
    expect(tax).toBeGreaterThan(0)

    const list = await request
      .get(API_BASE + '/orders', {
        headers: { Cookie: cookieHeader },
      })
      .then((r) => r.json())
    const orders = list?.data ?? list
    expect(Array.isArray(orders)).toBeTruthy()
    expect(orders.length).toBeGreaterThan(0)
  })

  test('order detail page renders the placed order with shipping + timeline', async ({
    page,
    request,
  }) => {
    await signup(page)
    await addFirstProductToCart(page, 1)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const create = await request.post(API_BASE + '/orders', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        shippingAddress: {
          name: 'Detail Shopper',
          line1: '742 Evergreen Tr',
          line2: '',
          city: 'Springfield',
          state: 'OR',
          postalCode: '97477',
          country: 'US',
        },
      },
    })
    expect(create.status()).toBeLessThan(300)
    const body = (await create.json()) as { id?: string }
    const orderId = body.id
    expect(orderId).toBeTruthy()

    await page.goto(APP_BASE + '/orders/' + orderId)
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const text = (await page.locator('body').textContent()) ?? ''
    // Shipping address is rendered (proves shipping_address → shippingInfo
    // mapping survived the API → React component data plumbing).
    expect(text).toContain('Detail Shopper')
    expect(text).toContain('742 Evergreen Tr')
    expect(text).toContain('Springfield')
    expect(text).toContain('OR')
    expect(text).toContain('97477')
    // Timeline stages always render — we synthesize them from order.status
    // so the four-stage progress card is never empty.
    expect(text).toContain('Confirmed')
    expect(text).toContain('Processing')
    expect(text).toContain('Shipped')
    expect(text).toContain('Delivered')
  })

  // Merchant lifecycle ops are gated by the order resource merchant authorizer
  // (the store admin). A plain buyer — even the owner of the order — must NOT be
  // able to drive them. These prove "buyer-can't" over the real HTTP path; the
  // store-admin "merchant-can" path is covered by the API unit suite + admin
  // e2e (which use a store-admin identity).
  test('a plain buyer CANNOT refund their own order (merchant-only): 403', async ({
    page,
    request,
  }) => {
    await signup(page)
    await addFirstProductToCart(page, 1)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const create = await request.post(API_BASE + '/orders', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        shippingAddress: {
          name: 'Refund Shopper',
          line1: '1 Market St',
          line2: '',
          city: 'Fairview',
          state: 'CA',
          postalCode: '94105',
          country: 'US',
        },
      },
    })
    expect(create.status()).toBeLessThan(300)
    const orderId = ((await create.json()) as { id?: string }).id
    expect(orderId).toBeTruthy()

    const refund = await request.post(API_BASE + `/orders/${orderId}/refund`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {},
    })
    expect(refund.status()).toBe(403)
  })

  test('a plain buyer CANNOT drive a merchant-state status change on their own order: 403', async ({
    page,
    request,
  }) => {
    await signup(page)
    await addFirstProductToCart(page, 1)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const create = await request.post(API_BASE + '/orders', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: {
        shippingAddress: {
          name: 'Ship Shopper',
          line1: '2 Market St',
          line2: '',
          city: 'Fairview',
          state: 'CA',
          postalCode: '94105',
          country: 'US',
        },
      },
    })
    expect(create.status()).toBeLessThan(300)
    const orderId = ((await create.json()) as { id?: string }).id
    expect(orderId).toBeTruthy()

    const ship = await request.put(API_BASE + `/orders/${orderId}/status`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { status: 'shipped' },
    })
    expect(ship.status()).toBe(403)
  })
})
