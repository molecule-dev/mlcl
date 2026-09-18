/**
 * Order merchant-authorizer gate (M6-1).
 *
 * `@molecule/api-resource-order` fails CLOSED on its MERCHANT-only lifecycle
 * ops (refund, a transition into a merchant state, cancelling an order that has
 * progressed past `pending`) until the app registers a merchant authorizer.
 * course-marketplace is a MULTI-SELLER marketplace, so the merchant is the
 * instructor who owns the order's course(s) (`courses.instructor_id`).
 *
 * This suite drives the REAL package handlers (`refund` / `updateStatus` /
 * `cancel`) through the app's registered seller-ownership authorizer and proves:
 *   - with NO authorizer registered, even the rightful seller is 403'd (the
 *     package's fail-closed default),
 *   - the owning instructor (SELLER) CAN confirm / ship / deliver / refund /
 *     cancel a progressed order — note the seller is NOT the order owner,
 *   - a plain buyer (the order owner) is 403'd with `order.error.merchantForbidden`
 *     on every merchant op (ship / deliver / refund / cancel-of-progressed),
 *   - a buyer may STILL cancel their OWN order while it is still `pending`,
 *   - a non-owner attempting to cancel someone else's pending order is 403'd
 *     with `order.error.forbidden`.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

const { findByIdMock, findManyMock, updateByIdMock, createMock } = vi.hoisted(() => ({
  findByIdMock: vi.fn(),
  findManyMock: vi.fn(),
  updateByIdMock: vi.fn(),
  createMock: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  findById: findByIdMock,
  findMany: findManyMock,
  updateById: updateByIdMock,
  create: createMock,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cancel,
  type OrderRow,
  type OrderStatus,
  refund,
  setOrderMerchantAuthorizer,
  updateStatus,
} from '@molecule/api-resource-order'

import {
  orderMerchantAuthorizer,
  setupOrderMerchantAuthorizer,
} from '../authorizers/order-merchant.js'

const SELLER_ID = 'seller-1' // instructor who owns COURSE_ID
const BUYER_ID = 'buyer-1' // the order owner (records as orderRow.userId)
const INTRUDER_ID = 'intruder-1' // neither buyer nor seller
const COURSE_ID = 'course-1'

/** Builds a fully-typed order row owned by the BUYER in the given status. */
function makeOrder(id: string, status: OrderStatus): OrderRow {
  return {
    id,
    userId: BUYER_ID,
    status,
    subtotal: 50,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 50,
    shippingAddress: null,
    billingAddress: null,
    paymentId: null,
    notes: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(id: string, body: AnyRecord = {}): any {
  return { params: { id }, body, query: {} }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(userId: string | undefined): any {
  return {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    locals: userId ? { session: { userId } } : {},
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
}

let orders: Record<string, OrderRow>

beforeEach(() => {
  vi.clearAllMocks()
  // Every test starts default-DENY (no authorizer registered).
  setOrderMerchantAuthorizer(null)

  orders = {
    'order-pending': makeOrder('order-pending', 'pending'),
    'order-confirmed': makeOrder('order-confirmed', 'confirmed'),
    'order-shipped': makeOrder('order-shipped', 'shipped'),
    'order-delivered': makeOrder('order-delivered', 'delivered'),
  }

  findByIdMock.mockImplementation(async (table: string, id: string) =>
    table === 'orders' ? (orders[id] ?? null) : null,
  )

  findManyMock.mockImplementation(async (table: string, opts: AnyRecord) => {
    if (table === 'order_items') {
      const orderId = String(opts.where?.[0]?.value ?? '')
      // Every fixture order contains the single seller-owned course.
      return [
        {
          id: 'item-1',
          orderId,
          productId: COURSE_ID,
          variantId: null,
          name: 'Intro to Pottery',
          price: 50,
          quantity: 1,
          image: null,
        },
      ]
    }
    if (table === 'courses') {
      const ids = (opts.where?.[0]?.value ?? []) as string[]
      return ids.includes(COURSE_ID) ? [{ id: COURSE_ID, instructor_id: SELLER_ID }] : []
    }
    return []
  })

  updateByIdMock.mockResolvedValue({})
  createMock.mockResolvedValue({})
})

describe('order-merchant authorizer (seller-ownership predicate)', () => {
  beforeEach(() => {
    setupOrderMerchantAuthorizer()
  })

  it('grants the instructor who owns the order’s course', async () => {
    expect(await orderMerchantAuthorizer(orders['order-pending'], SELLER_ID)).toBe(true)
  })

  it('denies the buyer (order owner is not the seller)', async () => {
    expect(await orderMerchantAuthorizer(orders['order-pending'], BUYER_ID)).toBe(false)
  })

  it('denies a different instructor who does not own the course', async () => {
    expect(await orderMerchantAuthorizer(orders['order-pending'], INTRUDER_ID)).toBe(false)
  })

  it('fails closed when the order has no resolvable products', async () => {
    findManyMock.mockImplementation(async () => [])
    expect(await orderMerchantAuthorizer(orders['order-pending'], SELLER_ID)).toBe(false)
  })
})

describe('refund — merchant-only', () => {
  it('fails closed (403) when NO authorizer is registered — even for the seller', async () => {
    const res = mockRes(SELLER_ID)
    await refund(mockReq('order-delivered'), res)
    expect(res.statusCode).toBe(403)
    expect(res.body.errorKey).toBe('order.error.merchantForbidden')
  })

  describe('with the marketplace authorizer registered', () => {
    beforeEach(() => {
      setupOrderMerchantAuthorizer()
    })

    it('403s a plain buyer (the order owner)', async () => {
      const res = mockRes(BUYER_ID)
      await refund(mockReq('order-delivered'), res)
      expect(res.statusCode).toBe(403)
      expect(res.body.errorKey).toBe('order.error.merchantForbidden')
    })

    it('lets the owning instructor (seller) refund a delivered order', async () => {
      const res = mockRes(SELLER_ID)
      await refund(mockReq('order-delivered'), res)
      expect(res.statusCode).toBeUndefined() // 200
      expect(res.body.status).toBe('refunded')
      expect(res.body.orderId).toBe('order-delivered')
      expect(updateByIdMock).toHaveBeenCalledWith(
        'orders',
        'order-delivered',
        expect.objectContaining({ status: 'refunded' }),
      )
    })
  })
})

describe('updateStatus — merchant states are merchant-only', () => {
  beforeEach(() => {
    setupOrderMerchantAuthorizer()
  })

  it('403s a buyer trying to confirm their own pending order', async () => {
    const res = mockRes(BUYER_ID)
    await updateStatus(mockReq('order-pending', { status: 'confirmed' }), res)
    expect(res.statusCode).toBe(403)
    expect(res.body.errorKey).toBe('order.error.merchantForbidden')
  })

  it('403s a buyer trying to mark their own shipped order delivered', async () => {
    const res = mockRes(BUYER_ID)
    await updateStatus(mockReq('order-shipped', { status: 'delivered' }), res)
    expect(res.statusCode).toBe(403)
    expect(res.body.errorKey).toBe('order.error.merchantForbidden')
  })

  it('lets the seller confirm a pending order', async () => {
    const res = mockRes(SELLER_ID)
    await updateStatus(mockReq('order-pending', { status: 'confirmed' }), res)
    expect(res.statusCode).toBeUndefined() // 200
    expect(res.body.status).toBe('confirmed')
  })

  it('lets the seller mark a shipped order delivered', async () => {
    const res = mockRes(SELLER_ID)
    await updateStatus(mockReq('order-shipped', { status: 'delivered' }), res)
    expect(res.statusCode).toBeUndefined() // 200
    expect(res.body.status).toBe('delivered')
  })
})

describe('cancel — buyer self-service only while pending', () => {
  beforeEach(() => {
    setupOrderMerchantAuthorizer()
  })

  it('lets the buyer cancel their OWN pending order', async () => {
    const res = mockRes(BUYER_ID)
    await cancel(mockReq('order-pending', { reason: 'changed my mind' }), res)
    expect(res.statusCode).toBeUndefined() // 200
    expect(res.body.status).toBe('cancelled')
  })

  it('403s a non-owner cancelling someone else’s pending order (owner check)', async () => {
    const res = mockRes(INTRUDER_ID)
    await cancel(mockReq('order-pending'), res)
    expect(res.statusCode).toBe(403)
    expect(res.body.errorKey).toBe('order.error.forbidden')
  })

  it('403s the buyer cancelling their own already-progressed (confirmed) order', async () => {
    const res = mockRes(BUYER_ID)
    await cancel(mockReq('order-confirmed'), res)
    expect(res.statusCode).toBe(403)
    expect(res.body.errorKey).toBe('order.error.merchantForbidden')
  })

  it('lets the seller cancel a progressed (confirmed) order', async () => {
    const res = mockRes(SELLER_ID)
    await cancel(mockReq('order-confirmed', { reason: 'out of stock' }), res)
    expect(res.statusCode).toBeUndefined() // 200
    expect(res.body.status).toBe('cancelled')
  })
})
