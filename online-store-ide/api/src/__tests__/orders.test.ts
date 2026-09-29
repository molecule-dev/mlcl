import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Uses the REAL @molecule/api-resource-order merchant gate so these tests prove
// the handler actually consults it (fail-closed by default; allowed only when a
// registered authorizer returns true). Only the DB / side-effect deps are
// mocked.
import { setOrderMerchantAuthorizer } from '@molecule/api-resource-order'

const findById = vi.fn()
const updateById = vi.fn()
const query = vi.fn()
const findMany = vi.fn()
const connect = vi.fn()
const count = vi.fn()
const deleteMany = vi.fn()
const findOne = vi.fn()

vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => findById(...args),
  updateById: (...args: unknown[]) => updateById(...args),
  query: (...args: unknown[]) => query(...args),
  findMany: (...args: unknown[]) => findMany(...args),
  connect: (...args: unknown[]) => connect(...args),
  count: (...args: unknown[]) => count(...args),
  deleteMany: (...args: unknown[]) => deleteMany(...args),
  findOne: (...args: unknown[]) => findOne(...args),
}))

// i18n stub returns the KEY so assertions can pin the EXACT errorKey contract.
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string) => key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-emails', () => ({
  sendMail: vi.fn().mockResolvedValue({}),
}))

// Bypass validation middleware — handlers are invoked directly.
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

// Imported after the mocks above are declared (vitest hoists vi.mock).
import { refund, updateStatus } from '../handlers/orders.js'

// snake_case row exactly as this store's `orders` table returns it.
const ORDER_ROW = {
  id: 'order-1',
  user_id: 'buyer-1',
  status: 'pending',
  subtotal: 20,
  tax: 2,
  total: 22,
  currency: 'USD',
  shipping_address: { city: 'SF' },
  billing_address: null,
  payment_method_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const ITEM_ROW = { id: 'item-1', order_id: 'order-1', product_id: 'prod-1', quantity: 2 }

function mockReq(overrides: Record<string, unknown> = {}): Request {
  return { params: {}, body: {}, query: {}, ...overrides } as unknown as Request
}

function mockRes(userId?: string): Response & { status: ReturnType<typeof vi.fn> } {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    locals: { session: userId ? { userId } : undefined },
  }
  return res as unknown as Response & { status: ReturnType<typeof vi.fn> }
}

/** Caller identity helper: only 'admin-1' is the merchant. */
const onlyAdminIsMerchant = () =>
  setOrderMerchantAuthorizer((_orderRow, userId) => userId === 'admin-1')

describe('orders handlers — merchant gate (M6-1)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Fail-closed by default: every test starts with NO authorizer registered.
    setOrderMerchantAuthorizer(null)
  })

  describe('refund (always merchant-only — no owner check)', () => {
    it('returns 401 when not authenticated', async () => {
      const res = mockRes()
      await refund(mockReq({ params: { id: 'order-1' } }), res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 404 when the order does not exist', async () => {
      findById.mockResolvedValue(null)
      const res = mockRes('admin-1')
      await refund(mockReq({ params: { id: 'missing' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('FAILS CLOSED: 403 merchantForbidden when no authorizer is registered', async () => {
      findById.mockResolvedValue({ ...ORDER_ROW })
      const res = mockRes('admin-1')
      await refund(mockReq({ params: { id: 'order-1' } }), res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'order.error.merchantForbidden' })
      expect(query).not.toHaveBeenCalled()
    })

    it('DENIES the buyer-owner: 403 merchantForbidden (owning the order is not enough)', async () => {
      onlyAdminIsMerchant()
      // ORDER_ROW.user_id === 'buyer-1' — the caller IS the order owner.
      findById.mockResolvedValue({ ...ORDER_ROW })
      const res = mockRes('buyer-1')
      await refund(mockReq({ params: { id: 'order-1' } }), res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'order.error.merchantForbidden' })
      expect(query).not.toHaveBeenCalled()
    })

    it('ALLOWS the merchant (store admin): refunds and restocks', async () => {
      onlyAdminIsMerchant()
      findById.mockResolvedValue({ ...ORDER_ROW })
      query.mockResolvedValue({ rowCount: 1, rows: [{ id: 'order-1' }] })
      findMany.mockResolvedValue([ITEM_ROW])
      const res = mockRes('admin-1')
      await refund(mockReq({ params: { id: 'order-1' } }), res)
      expect(query).toHaveBeenCalled()
      // Refund reverses the Bestsellers counter (products.total_sold), clamped at 0.
      const dec = query.mock.calls.find((c) =>
        /UPDATE products SET total_sold = GREATEST\(total_sold - \$1, 0\)/.test(String(c[0])),
      )
      expect(dec).toBeDefined()
      expect(dec?.[1]).toEqual([2, 'prod-1'])
      expect(res.json).toHaveBeenCalledWith({ status: 'refunded', orderId: 'order-1' })
    })
  })

  describe('updateStatus — merchant states (confirmed/processing/shipped/delivered)', () => {
    it('returns 401 when not authenticated', async () => {
      const res = mockRes()
      await updateStatus(mockReq({ params: { id: 'order-1' }, body: { status: 'shipped' } }), res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 404 when the order does not exist', async () => {
      findById.mockResolvedValue(null)
      const res = mockRes('admin-1')
      await updateStatus(mockReq({ params: { id: 'missing' }, body: { status: 'shipped' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('DENIES the buyer: 403 merchantForbidden on a merchant-state transition', async () => {
      onlyAdminIsMerchant()
      findById.mockResolvedValue({ ...ORDER_ROW, status: 'confirmed' })
      const res = mockRes('buyer-1')
      await updateStatus(mockReq({ params: { id: 'order-1' }, body: { status: 'shipped' } }), res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'order.error.merchantForbidden' })
      expect(updateById).not.toHaveBeenCalled()
    })

    it('FAILS CLOSED on a merchant-state transition when no authorizer is registered', async () => {
      findById.mockResolvedValue({ ...ORDER_ROW, status: 'confirmed' })
      const res = mockRes('admin-1')
      await updateStatus(mockReq({ params: { id: 'order-1' }, body: { status: 'delivered' } }), res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'order.error.merchantForbidden' })
      expect(updateById).not.toHaveBeenCalled()
    })

    it('ALLOWS the merchant to ship an order', async () => {
      onlyAdminIsMerchant()
      findById.mockResolvedValue({ ...ORDER_ROW, status: 'confirmed' })
      updateById.mockResolvedValue({ data: { id: 'order-1', status: 'shipped' } })
      const res = mockRes('admin-1')
      await updateStatus(mockReq({ params: { id: 'order-1' }, body: { status: 'shipped' } }), res)
      expect(updateById).toHaveBeenCalledWith(
        'orders',
        'order-1',
        expect.objectContaining({ status: 'shipped' }),
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'order-1', status: 'shipped' }),
      )
    })
  })

  describe('updateStatus — cancel (buyer self-service for pending; merchant otherwise)', () => {
    it('lets the BUYER cancel their OWN pending order (no merchant needed)', async () => {
      // Authorizer denies everyone — proves owner+pending does NOT need merchant.
      setOrderMerchantAuthorizer(() => false)
      findById.mockResolvedValue({ ...ORDER_ROW, status: 'pending', user_id: 'buyer-1' })
      updateById.mockResolvedValue({ data: { id: 'order-1', status: 'cancelled' } })
      const res = mockRes('buyer-1')
      await updateStatus(mockReq({ params: { id: 'order-1' }, body: { status: 'cancelled' } }), res)
      expect(updateById).toHaveBeenCalledWith(
        'orders',
        'order-1',
        expect.objectContaining({ status: 'cancelled' }),
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'order-1', status: 'cancelled' }),
      )
    })

    it('403 order.forbidden (owner check) when a buyer cancels SOMEONE ELSE’S pending order', async () => {
      findById.mockResolvedValue({ ...ORDER_ROW, status: 'pending', user_id: 'buyer-1' })
      const res = mockRes('intruder-1')
      await updateStatus(mockReq({ params: { id: 'order-1' }, body: { status: 'cancelled' } }), res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'order.forbidden' })
      expect(updateById).not.toHaveBeenCalled()
    })

    it('DENIES a buyer cancelling an already-PROGRESSED order: 403 merchantForbidden', async () => {
      setOrderMerchantAuthorizer(() => false)
      findById.mockResolvedValue({ ...ORDER_ROW, status: 'confirmed', user_id: 'buyer-1' })
      const res = mockRes('buyer-1')
      await updateStatus(mockReq({ params: { id: 'order-1' }, body: { status: 'cancelled' } }), res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'order.error.merchantForbidden' })
      expect(updateById).not.toHaveBeenCalled()
    })

    it('ALLOWS the merchant to cancel an already-progressed order', async () => {
      onlyAdminIsMerchant()
      findById.mockResolvedValue({ ...ORDER_ROW, status: 'processing', user_id: 'buyer-1' })
      updateById.mockResolvedValue({ data: { id: 'order-1', status: 'cancelled' } })
      const res = mockRes('admin-1')
      await updateStatus(mockReq({ params: { id: 'order-1' }, body: { status: 'cancelled' } }), res)
      expect(updateById).toHaveBeenCalledWith(
        'orders',
        'order-1',
        expect.objectContaining({ status: 'cancelled' }),
      )
    })
  })
})
