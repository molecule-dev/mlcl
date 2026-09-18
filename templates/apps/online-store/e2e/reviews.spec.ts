import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, signup, addFirstProductToCart, promoteToAdmin } from './_helpers.js'

test.describe('reviews API', () => {
  test('GET /reviews/product/:id returns a list (empty for an unreviewed product)', async ({
    page,
  }) => {
    await signup(page)
    const list = await page.request.get(API_BASE + '/products?limit=1').then((r) => r.json())
    const product = (list?.data ?? list ?? [])[0]
    expect(product?.id).toBeTruthy()
    const resp = await page.request.get(API_BASE + `/reviews/product/${product.id}`)
    expect(resp.status()).toBe(200)
    const body = await resp.json()
    const arr = body?.data ?? body
    expect(Array.isArray(arr)).toBe(true)
  })

  test('POST /reviews is gated on a delivered order — 403 before, 201 after', async ({ page }) => {
    await signup(page)
    // The delivery step below drives the requireAdmin-gated PUT /admin/orders/:id/status.
    // Become the operator so that write succeeds; this does NOT relax the review gate
    // (which keys off a *delivered order*, not role), so the "403 before delivered"
    // assertion still holds.
    await promoteToAdmin(page)
    const { product } = await addFirstProductToCart(page, 1)
    const shipping = {
      name: 'Reviewer',
      line1: '1 Review St',
      city: 'Reviewville',
      state: 'CA',
      postalCode: '94100',
      country: 'US',
    }
    const orderResp = await page.request.post(API_BASE + '/orders', {
      data: {
        shippingAddress: shipping,
        billingAddress: shipping,
        paymentMethodId: 'pm_demo_card',
      },
    })
    expect([200, 201]).toContain(orderResp.status())
    const orderBody = await orderResp.json()
    const orderId = orderBody?.id || orderBody?.order?.id || orderBody?.data?.id
    expect(typeof orderId).toBe('string')

    // Before delivered: review is rejected.
    const blocked = await page.request.post(API_BASE + '/reviews', {
      data: { productId: product.id, rating: 5, title: 'Premature', body: 'Not yet.' },
    })
    expect(blocked.status()).toBe(403)

    // Promote to delivered via admin route — same authed session.
    const promote = await page.request.put(API_BASE + `/admin/orders/${orderId}/status`, {
      data: { status: 'delivered' },
    })
    expect(promote.status()).toBe(200)

    const created = await page.request.post(API_BASE + '/reviews', {
      data: { productId: product.id, rating: 5, title: 'Great!', body: 'Loved it.' },
    })
    expect(created.status()).toBe(201)
    const reviewBody = await created.json()
    const reviewId = reviewBody?.id || reviewBody?.data?.id
    expect(typeof reviewId).toBe('string')

    // Read-after-write: the review shows up in the product reviews list.
    const after = await page.request
      .get(API_BASE + `/reviews/product/${product.id}`)
      .then((r) => r.json())
    const arr = after?.data ?? after ?? []
    expect(
      Array.isArray(arr) &&
        arr.some(
          (r: { id: string; rating: number }) => r.id === reviewId && Number(r.rating) === 5,
        ),
    ).toBe(true)

    // Idempotency: posting again returns 409, not silently dupes.
    const dup = await page.request.post(API_BASE + '/reviews', {
      data: { productId: product.id, rating: 4, title: 'Updated', body: 'second pass' },
    })
    expect(dup.status()).toBe(409)
  })
})
