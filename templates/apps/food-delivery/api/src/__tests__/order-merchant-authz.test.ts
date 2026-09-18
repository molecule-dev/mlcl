import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BUYER_ALLOWED_ORDER_TRANSITIONS,
  MERCHANT_ORDER_STATUSES,
} from '../middleware/order-merchant.js'

// M6-1: merchant authorization for the order lifecycle. The order owner is the
// BUYER; merchant-only ops (advancing into a merchant state, cancelling a
// progressed order) must be driven by the restaurant OWNER, not the buyer, and
// must fail CLOSED until an authorizer is registered. These tests exercise the
// real @molecule/api-resource-order gate (NOT mocked) over a mocked DB so they
// genuinely prove buyer-can't / merchant-can.

const findById = vi.fn()
const updateById = vi.fn()
const create = vi.fn()
const findMany = vi.fn()

vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => findById(...args),
  updateById: (...args: unknown[]) => updateById(...args),
  create: (...args: unknown[]) => create(...args),
  findMany: (...args: unknown[]) => findMany(...args),
}))

// i18n stub returns the English defaultValue so assertions stay readable; the
// order resource's i18n module also calls registerLocaleModule at import time.
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-geolocation', () => ({
  distance: vi.fn(() => 0),
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: { locals?: { session?: { userId?: string } } }) => res?.locals?.session?.userId,
  getParamId: (req: { params?: { id?: string } }) => req?.params?.id,
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

type MockRes = Response & { statusCode?: number; body?: Record<string, unknown> }

function makeRes(userId?: string): MockRes {
  const res = {
    locals: { session: userId ? { userId } : undefined },
  } as unknown as MockRes
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  }) as unknown as Response['status']
  res.json = vi.fn((payload: unknown) => {
    res.body = payload as Record<string, unknown>
    return res
  }) as unknown as Response['json']
  return res
}

function makeReq(id: string, body: Record<string, unknown> = {}): Request {
  return { params: { id }, body } as unknown as Request
}

// rest-1 is owned by `merchant-1`; both orders belong to BUYER `buyer-1`.
const RESTAURANTS: Record<string, Record<string, unknown>> = {
  'rest-1': { id: 'rest-1', owner_id: 'merchant-1' },
}
const ORDERS: Record<string, Record<string, unknown>> = {
  'order-placed': {
    id: 'order-placed',
    customer_id: 'buyer-1',
    restaurant_id: 'rest-1',
    status: 'placed',
  },
  'order-confirmed': {
    id: 'order-confirmed',
    customer_id: 'buyer-1',
    restaurant_id: 'rest-1',
    status: 'confirmed',
  },
}

function errorKey(res: MockRes): string | undefined {
  return (res.body as { errorKey?: string } | undefined)?.errorKey
}

describe('order merchant authorization (M6-1)', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    findById.mockImplementation(async (table: string, id: string) => {
      if (table === 'orders') return ORDERS[id] ?? null
      if (table === 'restaurants') return RESTAURANTS[id] ?? null
      return null
    })
    updateById.mockImplementation(
      async (_table: string, _id: string, patch: Record<string, unknown>) => ({
        data: { ...patch },
      }),
    )
    // Register the real merchant authorizer (restaurant-owner gate) per test.
    const { registerOrderMerchantAuthorizer } = await import('../middleware/order-merchant.js')
    registerOrderMerchantAuthorizer()
  })

  it('models the merchant lifecycle on restaurant ownership, not buyer ownership', () => {
    // The buyer's ONLY self-service lifecycle action is cancelling a placed order.
    expect(BUYER_ALLOWED_ORDER_TRANSITIONS.placed).toEqual(['cancelled'])
    expect(BUYER_ALLOWED_ORDER_TRANSITIONS.confirmed).toEqual([])
    expect(MERCHANT_ORDER_STATUSES).toContain('preparing')
    expect(MERCHANT_ORDER_STATUSES).toContain('delivered')
  })

  describe('PUT /orders/:id/status (updateOrderStatus)', () => {
    it('403s a plain buyer (order owner) advancing into a merchant state', async () => {
      const { updateOrderStatus } = await import('../handlers/orders.js')
      const res = makeRes('buyer-1') // the BUYER who owns the order
      await updateOrderStatus(makeReq('order-placed', { status: 'preparing' }), res)
      expect(res.statusCode).toBe(403)
      expect(errorKey(res)).toBe('order.error.merchantForbidden')
      expect(updateById).not.toHaveBeenCalled()
    })

    it('lets the restaurant owner (merchant) advance the order', async () => {
      const { updateOrderStatus } = await import('../handlers/orders.js')
      const res = makeRes('merchant-1') // owns rest-1
      await updateOrderStatus(makeReq('order-placed', { status: 'preparing' }), res)
      expect(res.statusCode).toBeUndefined() // success → no error status
      expect(updateById).toHaveBeenCalledWith(
        'orders',
        'order-placed',
        expect.objectContaining({ status: 'preparing' }),
      )
    })

    it('fails closed (403) when no merchant authorizer is registered', async () => {
      const { setOrderMerchantAuthorizer } = await import('@molecule/api-resource-order')
      setOrderMerchantAuthorizer(null)
      const { updateOrderStatus } = await import('../handlers/orders.js')
      const res = makeRes('merchant-1') // even the real owner is denied with no authorizer
      await updateOrderStatus(makeReq('order-placed', { status: 'preparing' }), res)
      expect(res.statusCode).toBe(403)
      expect(errorKey(res)).toBe('order.error.merchantForbidden')
      expect(updateById).not.toHaveBeenCalled()
    })

    it('401s an unauthenticated caller', async () => {
      const { updateOrderStatus } = await import('../handlers/orders.js')
      const res = makeRes(undefined)
      await updateOrderStatus(makeReq('order-placed', { status: 'preparing' }), res)
      expect(res.statusCode).toBe(401)
      expect(updateById).not.toHaveBeenCalled()
    })

    it('404s when the order does not exist', async () => {
      const { updateOrderStatus } = await import('../handlers/orders.js')
      const res = makeRes('merchant-1')
      await updateOrderStatus(makeReq('missing', { status: 'preparing' }), res)
      expect(res.statusCode).toBe(404)
    })
  })

  describe('POST /orders/:id/cancel (cancelOrder)', () => {
    it('lets the buyer cancel their OWN still-placed order', async () => {
      const { cancelOrder } = await import('../handlers/orders.js')
      const res = makeRes('buyer-1')
      await cancelOrder(makeReq('order-placed'), res)
      expect(res.statusCode).toBeUndefined()
      expect(updateById).toHaveBeenCalledWith(
        'orders',
        'order-placed',
        expect.objectContaining({ status: 'cancelled' }),
      )
    })

    it("403s a different user cancelling someone else's placed order", async () => {
      const { cancelOrder } = await import('../handlers/orders.js')
      const res = makeRes('buyer-2') // not the owner
      await cancelOrder(makeReq('order-placed'), res)
      expect(res.statusCode).toBe(403)
      expect(errorKey(res)).toBe('order.error.forbidden')
      expect(updateById).not.toHaveBeenCalled()
    })

    it('403s the buyer cancelling a progressed (confirmed) order — merchant-only', async () => {
      const { cancelOrder } = await import('../handlers/orders.js')
      const res = makeRes('buyer-1') // owns the order, but it has progressed past placed
      await cancelOrder(makeReq('order-confirmed'), res)
      expect(res.statusCode).toBe(403)
      expect(errorKey(res)).toBe('order.error.merchantForbidden')
      expect(updateById).not.toHaveBeenCalled()
    })

    it('lets the restaurant owner (merchant) cancel a progressed order', async () => {
      const { cancelOrder } = await import('../handlers/orders.js')
      const res = makeRes('merchant-1')
      await cancelOrder(makeReq('order-confirmed'), res)
      expect(res.statusCode).toBeUndefined()
      expect(updateById).toHaveBeenCalledWith(
        'orders',
        'order-confirmed',
        expect.objectContaining({ status: 'cancelled' }),
      )
    })
  })
})
