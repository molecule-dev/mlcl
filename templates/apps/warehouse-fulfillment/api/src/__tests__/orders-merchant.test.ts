// M6-1: proves the warehouse-fulfillment app's merchant-authorizer wiring.
//
// @molecule/api-resource-order fails CLOSED on merchant ops (refund, a
// transition INTO a merchant state, and cancelling an already-progressed
// order): each returns 403 until the app registers a merchant authorizer. This
// app registers `isOrderMerchant` in setupBonds via `setupOrderAuthorizer()`.
//
// In this single-tenant warehouse the order's `userId` is the OPERATOR
// (merchant), not the buyer — the external buyer is only `customerName` /
// `customerEmail`. So "merchant" = the owning operator and any other user is a
// non-merchant ("plain buyer" from the gate's perspective) who must be 403'd on
// merchant ops. These tests exercise the REAL package handlers + gate (only the
// DB/i18n/logger are mocked) so they genuinely prove buyer-can't / merchant-can.

const { mockCreate, mockFindById, mockFindMany, mockUpdateById } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockUpdateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findMany: mockFindMany,
  updateById: mockUpdateById,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cancel,
  canDriveOrderLifecycle,
  getOrderMerchantAuthorizer,
  type OrderRow,
  refund,
  setOrderMerchantAuthorizer,
  updateStatus,
} from '@molecule/api-resource-order'

import { isOrderMerchant, setupOrderAuthorizer } from '../bonds/order-authorizer.js'

const OPERATOR = 'operator-1' // owns order-1 → the merchant for it
const OTHER_USER = 'operator-2' // any other user → a non-merchant for order-1

function orderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'order-1',
    userId: OPERATOR,
    status: 'pending',
    subtotal: 20,
    tax: 2,
    shipping: 5,
    discount: 0,
    total: 27,
    shippingAddress: null,
    billingAddress: null,
    paymentId: null,
    notes: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return { params: { id: 'order-1' }, body: {}, query: {}, ...overrides }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(userId: string | null): any {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: { session: userId ? { userId } : undefined },
  }
}

describe('warehouse-fulfillment order merchant authorizer (M6-1 wiring)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Every test starts fail-closed: no authorizer registered.
    setOrderMerchantAuthorizer(null)
  })

  describe('isOrderMerchant predicate', () => {
    it('is true for the owning operator (the merchant for the order)', () => {
      expect(isOrderMerchant(orderRow(), OPERATOR)).toBe(true)
    })

    it('is false for any other user (a non-merchant)', () => {
      expect(isOrderMerchant(orderRow(), OTHER_USER)).toBe(false)
    })
  })

  describe('setupOrderAuthorizer registration + gate', () => {
    it('fails closed before registration — default deny', async () => {
      expect(getOrderMerchantAuthorizer()).toBeNull()
      expect(await canDriveOrderLifecycle(orderRow({ status: 'shipped' }), OPERATOR)).toBe(false)
    })

    it('registers isOrderMerchant as the merchant authorizer', () => {
      setupOrderAuthorizer()
      expect(getOrderMerchantAuthorizer()).toBe(isOrderMerchant)
    })

    it('allows the owning operator (merchant) to drive the lifecycle', async () => {
      setupOrderAuthorizer()
      expect(await canDriveOrderLifecycle(orderRow({ status: 'shipped' }), OPERATOR)).toBe(true)
    })

    it('denies any other user (non-merchant) — 403 territory', async () => {
      setupOrderAuthorizer()
      expect(await canDriveOrderLifecycle(orderRow({ status: 'shipped' }), OTHER_USER)).toBe(false)
    })
  })

  describe('refund — always merchant-only', () => {
    beforeEach(() => {
      setupOrderAuthorizer()
      mockUpdateById.mockResolvedValue({ data: {} })
      mockCreate.mockResolvedValue({ data: {} })
    })

    it('lets the merchant (owning operator) refund a delivered order', async () => {
      mockFindById.mockResolvedValue(orderRow({ status: 'delivered' }))
      const res = mockRes(OPERATOR)

      await refund(mockReq(), res)

      expect(res.status).not.toHaveBeenCalledWith(403)
      expect(mockUpdateById).toHaveBeenCalledWith(
        'orders',
        'order-1',
        expect.objectContaining({ status: 'refunded' }),
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-1', status: 'refunded' }),
      )
    })

    it('403s a non-merchant (plain buyer / other user) with order.error.merchantForbidden', async () => {
      mockFindById.mockResolvedValue(orderRow({ status: 'delivered' }))
      const res = mockRes(OTHER_USER)

      await refund(mockReq(), res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'order.error.merchantForbidden' }),
      )
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('403s even the owner when NO authorizer is registered (fail-closed)', async () => {
      setOrderMerchantAuthorizer(null)
      mockFindById.mockResolvedValue(orderRow({ status: 'delivered' }))
      const res = mockRes(OPERATOR)

      await refund(mockReq(), res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'order.error.merchantForbidden' }),
      )
      expect(mockUpdateById).not.toHaveBeenCalled()
    })
  })

  describe('updateStatus — transition INTO a merchant state', () => {
    beforeEach(() => {
      setupOrderAuthorizer()
      mockFindMany.mockResolvedValue([])
      mockUpdateById.mockResolvedValue({ data: {} })
      mockCreate.mockResolvedValue({ data: {} })
    })

    it('lets the merchant ship a processing order', async () => {
      mockFindById.mockResolvedValue(orderRow({ status: 'processing' }))
      const res = mockRes(OPERATOR)

      await updateStatus(mockReq({ body: { status: 'shipped' } }), res)

      expect(res.status).not.toHaveBeenCalledWith(403)
      expect(mockUpdateById).toHaveBeenCalledWith(
        'orders',
        'order-1',
        expect.objectContaining({ status: 'shipped' }),
      )
    })

    it('lets the merchant deliver a shipped order', async () => {
      mockFindById.mockResolvedValue(orderRow({ status: 'shipped' }))
      const res = mockRes(OPERATOR)

      await updateStatus(mockReq({ body: { status: 'delivered' } }), res)

      expect(res.status).not.toHaveBeenCalledWith(403)
      expect(mockUpdateById).toHaveBeenCalledWith(
        'orders',
        'order-1',
        expect.objectContaining({ status: 'delivered' }),
      )
    })

    it('403s a non-merchant attempting to ship — order.error.merchantForbidden', async () => {
      mockFindById.mockResolvedValue(orderRow({ status: 'processing' }))
      const res = mockRes(OTHER_USER)

      await updateStatus(mockReq({ body: { status: 'shipped' } }), res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'order.error.merchantForbidden' }),
      )
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('fails closed for a merchant-state transition when no authorizer is registered', async () => {
      setOrderMerchantAuthorizer(null)
      mockFindById.mockResolvedValue(orderRow({ status: 'processing' }))
      const res = mockRes(OPERATOR)

      await updateStatus(mockReq({ body: { status: 'shipped' } }), res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'order.error.merchantForbidden' }),
      )
      expect(mockUpdateById).not.toHaveBeenCalled()
    })
  })

  describe('cancel', () => {
    beforeEach(() => {
      mockFindMany.mockResolvedValue([])
      mockUpdateById.mockResolvedValue({ data: {} })
      mockCreate.mockResolvedValue({ data: {} })
    })

    it('lets a buyer (order owner) cancel their OWN pending order — no merchant authorizer needed', async () => {
      // Deliberately leave the authorizer unregistered (beforeEach cleared it):
      // pending-cancel is the one buyer self-service action and must not depend
      // on the merchant gate.
      mockFindById.mockResolvedValue(orderRow({ status: 'pending' }))
      const res = mockRes(OPERATOR)

      await cancel(mockReq(), res)

      expect(res.status).not.toHaveBeenCalledWith(403)
      expect(mockUpdateById).toHaveBeenCalledWith(
        'orders',
        'order-1',
        expect.objectContaining({ status: 'cancelled' }),
      )
    })

    it('403s a non-owner cancelling someone else’s pending order — order.error.forbidden', async () => {
      mockFindById.mockResolvedValue(orderRow({ status: 'pending' }))
      const res = mockRes(OTHER_USER)

      await cancel(mockReq(), res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'order.error.forbidden' }),
      )
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('lets the merchant cancel an already-progressed order', async () => {
      setupOrderAuthorizer()
      mockFindById.mockResolvedValue(orderRow({ status: 'confirmed' }))
      const res = mockRes(OPERATOR)

      await cancel(mockReq(), res)

      expect(res.status).not.toHaveBeenCalledWith(403)
      expect(mockUpdateById).toHaveBeenCalledWith(
        'orders',
        'order-1',
        expect.objectContaining({ status: 'cancelled' }),
      )
    })

    it('403s a non-merchant cancelling a progressed order — order.error.merchantForbidden', async () => {
      setupOrderAuthorizer()
      mockFindById.mockResolvedValue(orderRow({ status: 'confirmed' }))
      const res = mockRes(OTHER_USER)

      await cancel(mockReq(), res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'order.error.merchantForbidden' }),
      )
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('fails closed cancelling a progressed order when no authorizer is registered', async () => {
      mockFindById.mockResolvedValue(orderRow({ status: 'confirmed' }))
      const res = mockRes(OPERATOR)

      await cancel(mockReq(), res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'order.error.merchantForbidden' }),
      )
      expect(mockUpdateById).not.toHaveBeenCalled()
    })
  })
})
