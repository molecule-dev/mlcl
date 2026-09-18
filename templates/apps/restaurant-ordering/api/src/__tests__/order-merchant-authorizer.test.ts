/**
 * Proves the M6-1 merchant authorizer wiring for `@molecule/api-resource-order`.
 *
 * The package FAILS CLOSED on every merchant lifecycle op (refund, a
 * merchant-state `updateStatus`, cancelling an already-progressed order),
 * returning 403 `order.error.merchantForbidden` until an app registers a
 * merchant authorizer. This app registers one (`setupResourceOrder`) whose
 * merchant identity is the restaurant OPERATOR that owns the order — so:
 *   - with NO authorizer registered → every merchant op is 403 (fail-closed);
 *   - the operator/merchant who owns the order CAN ship / deliver / refund /
 *     cancel-progressed;
 *   - any OTHER user (a non-owner — the "buyer" analogue) is 403'd on those ops;
 *   - a buyer (order owner) cancelling their OWN still-`pending` order keeps
 *     working (owner-gated), and a non-owner cancelling a pending order gets the
 *     owner-check 403 `order.error.forbidden`.
 *
 * The handlers are exercised through the REAL package barrel (its gate flows
 * through `getOrderMerchantAuthorizer` → `canDriveOrderLifecycle`), so this
 * proves the wiring end-to-end, not a re-implementation of it.
 */
const { mockCreate, mockFindMany, mockFindById, mockUpdateById } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindById: vi.fn(),
  mockUpdateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findMany: mockFindMany,
  findById: mockFindById,
  updateById: mockUpdateById,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((key: string) => key),
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn() },
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

import { isOrderMerchant, setupResourceOrder } from '../bonds/resource-order.js'

const MERCHANT = 'operator-1'
const OTHER = 'operator-2'

function orderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'order-1',
    userId: MERCHANT,
    status: 'pending',
    subtotal: 20,
    tax: 2,
    shipping: 0,
    discount: 0,
    total: 22,
    shippingAddress: null,
    billingAddress: null,
    paymentId: null,
    notes: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// Minimal MoleculeRequest/MoleculeResponse doubles for direct handler calls.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return { params: {}, body: {}, query: {}, ...overrides }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(userId: string | undefined): any {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: userId ? { session: { userId } } : {},
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Start every test from the package's secure default: no authorizer.
  setOrderMerchantAuthorizer(null)
  mockFindById.mockResolvedValue(null)
  mockFindMany.mockResolvedValue([])
  mockCreate.mockResolvedValue({ data: { id: 'evt-1' }, affected: 1 })
  mockUpdateById.mockResolvedValue({ data: {}, affected: 1 })
})

describe('isOrderMerchant predicate (merchant = order-owning operator)', () => {
  it('is true for the operator that owns the order', () => {
    expect(isOrderMerchant(orderRow(), MERCHANT)).toBe(true)
  })

  it('is false for any other user (non-owner / buyer analogue)', () => {
    expect(isOrderMerchant(orderRow(), OTHER)).toBe(false)
  })
})

describe('setupResourceOrder registers the authorizer', () => {
  it('registers a non-null authorizer that allows the owning operator only', async () => {
    expect(getOrderMerchantAuthorizer()).toBeNull()
    setupResourceOrder()
    expect(getOrderMerchantAuthorizer()).not.toBeNull()
    await expect(canDriveOrderLifecycle(orderRow(), MERCHANT)).resolves.toBe(true)
    await expect(canDriveOrderLifecycle(orderRow(), OTHER)).resolves.toBe(false)
  })
})

describe('fail-closed: no authorizer registered → every merchant op is 403', () => {
  it('refund → 403 merchantForbidden', async () => {
    mockFindById.mockResolvedValue(orderRow({ status: 'delivered' }))
    const res = mockRes(MERCHANT)
    await refund(mockReq({ params: { id: 'order-1' } }), res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'order.error.merchantForbidden' }),
    )
    // Fail-closed: the mutation must NOT have run.
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('merchant-state updateStatus → 403 merchantForbidden', async () => {
    mockFindById.mockResolvedValue(orderRow({ status: 'processing' }))
    const res = mockRes(MERCHANT)
    await updateStatus(mockReq({ params: { id: 'order-1' }, body: { status: 'shipped' } }), res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'order.error.merchantForbidden' }),
    )
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('cancel of an already-progressed order → 403 merchantForbidden', async () => {
    mockFindById.mockResolvedValue(orderRow({ status: 'confirmed' }))
    const res = mockRes(MERCHANT)
    await cancel(mockReq({ params: { id: 'order-1' } }), res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'order.error.merchantForbidden' }),
    )
    expect(mockUpdateById).not.toHaveBeenCalled()
  })
})

describe('merchant-can: the owning operator drives the lifecycle', () => {
  beforeEach(() => setupResourceOrder())

  it('refunds a delivered order', async () => {
    mockFindById.mockResolvedValue(orderRow({ status: 'delivered' }))
    const res = mockRes(MERCHANT)
    await refund(mockReq({ params: { id: 'order-1' } }), res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'refunded', orderId: 'order-1' }),
    )
    expect(mockUpdateById).toHaveBeenCalledWith(
      'orders',
      'order-1',
      expect.objectContaining({ status: 'refunded' }),
    )
  })

  it('ships a processing order (merchant-state updateStatus)', async () => {
    mockFindById.mockResolvedValue(orderRow({ status: 'processing' }))
    const res = mockRes(MERCHANT)
    await updateStatus(mockReq({ params: { id: 'order-1' }, body: { status: 'shipped' } }), res)
    expect(mockUpdateById).toHaveBeenCalledWith(
      'orders',
      'order-1',
      expect.objectContaining({ status: 'shipped' }),
    )
    expect(res.status).not.toHaveBeenCalledWith(403)
  })

  it('cancels an already-progressed (confirmed) order', async () => {
    mockFindById.mockResolvedValue(orderRow({ status: 'confirmed' }))
    const res = mockRes(MERCHANT)
    await cancel(mockReq({ params: { id: 'order-1' } }), res)
    expect(mockUpdateById).toHaveBeenCalledWith(
      'orders',
      'order-1',
      expect.objectContaining({ status: 'cancelled' }),
    )
    expect(res.status).not.toHaveBeenCalledWith(403)
  })
})

describe('non-merchant CANNOT drive the lifecycle (buyer analogue is 403)', () => {
  beforeEach(() => setupResourceOrder())

  it('a non-owner refund → 403 merchantForbidden', async () => {
    mockFindById.mockResolvedValue(orderRow({ status: 'delivered' }))
    const res = mockRes(OTHER)
    await refund(mockReq({ params: { id: 'order-1' } }), res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'order.error.merchantForbidden' }),
    )
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('a non-owner ship (merchant-state updateStatus) → 403 merchantForbidden', async () => {
    mockFindById.mockResolvedValue(orderRow({ status: 'processing' }))
    const res = mockRes(OTHER)
    await updateStatus(mockReq({ params: { id: 'order-1' }, body: { status: 'shipped' } }), res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'order.error.merchantForbidden' }),
    )
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('a non-owner cancel of a progressed order → 403 merchantForbidden', async () => {
    mockFindById.mockResolvedValue(orderRow({ status: 'confirmed' }))
    const res = mockRes(OTHER)
    await cancel(mockReq({ params: { id: 'order-1' } }), res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'order.error.merchantForbidden' }),
    )
    expect(mockUpdateById).not.toHaveBeenCalled()
  })
})

describe('buyer cancel-of-pending stays owner-gated (no authorizer needed)', () => {
  it('the order owner can cancel their OWN pending order', async () => {
    // Intentionally NO authorizer registered — the buyer self-service path must
    // not depend on the merchant gate.
    mockFindById.mockResolvedValue(orderRow({ status: 'pending' }))
    const res = mockRes(MERCHANT)
    await cancel(mockReq({ params: { id: 'order-1' } }), res)
    expect(mockUpdateById).toHaveBeenCalledWith(
      'orders',
      'order-1',
      expect.objectContaining({ status: 'cancelled' }),
    )
    expect(res.status).not.toHaveBeenCalledWith(403)
  })

  it('a non-owner cancelling a pending order → 403 forbidden (owner-check key)', async () => {
    mockFindById.mockResolvedValue(orderRow({ status: 'pending' }))
    const res = mockRes(OTHER)
    await cancel(mockReq({ params: { id: 'order-1' } }), res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorKey: 'order.error.forbidden' }),
    )
    expect(mockUpdateById).not.toHaveBeenCalled()
  })
})
