import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The middleware designates the store owner via the ADMIN_EMAILS allow-list,
// read at module-evaluation time — set it before the SUT is imported.
process.env.ADMIN_EMAILS = 'owner@store.com'

const findById = vi.fn()
const updateById = vi.fn()

vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => findById(...args),
  updateById: (...args: unknown[]) => updateById(...args),
}))

// i18n stub returns the English defaultValue so assertions stay readable.
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

type MockRes = Response & {
  statusCode?: number
  body?: unknown
}

const makeRes = (session?: { userId?: string }): MockRes => {
  const res = {
    locals: { session },
  } as unknown as MockRes
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  }) as unknown as Response['status']
  res.json = vi.fn((payload: unknown) => {
    res.body = payload
    return res
  }) as unknown as Response['json']
  return res
}

describe('requireAdmin middleware (security findings L2-1 / L2-2)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when there is no authenticated session', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    const res = makeRes(undefined)
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
    expect(findById).not.toHaveBeenCalled()
  })

  it('returns 403 for an authenticated non-admin customer', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'user-1', email: 'customer@example.com', role: 'customer' })
    const res = makeRes({ userId: 'user-1' })
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
    expect(updateById).not.toHaveBeenCalled()
  })

  it('calls next() for a user whose role is already admin', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'user-2', email: 'someone@example.com', role: 'admin' })
    const res = makeRes({ userId: 'user-2' })
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('promotes and admits a user on the ADMIN_EMAILS allow-list', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'owner-1', email: 'Owner@Store.com', role: 'customer' })
    updateById.mockResolvedValue({ data: {} })
    const res = makeRes({ userId: 'owner-1' })
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(updateById).toHaveBeenCalledWith('users', 'owner-1', { role: 'admin' })
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 when the session user no longer exists', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue(null)
    const res = makeRes({ userId: 'ghost' })
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })
})

// The single-merchant store's MERCHANT identity. This is what backs the
// `@molecule/api-resource-order` merchant authorizer, so its correctness is what
// makes "a buyer can't refund/ship/deliver, the store admin can" true.
describe('isStoreAdmin / storeOrderMerchantAuthorizer (order merchant identity)', () => {
  // The order row is irrelevant to a single-merchant decision; the authorizer
  // keys off the caller. Minimal valid OrderRow to satisfy the type.
  const ORDER_ROW = {
    id: 'order-1',
    userId: 'buyer-1',
    status: 'delivered' as const,
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
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('isStoreAdmin: true for a user whose role is already admin (no promotion)', async () => {
    const { isStoreAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'admin-1', email: 'a@store.com', role: 'admin' })

    expect(await isStoreAdmin('admin-1')).toBe(true)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('isStoreAdmin: true for an ADMIN_EMAILS owner, and durably promotes them', async () => {
    const { isStoreAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'owner-1', email: 'Owner@Store.com', role: 'customer' })
    updateById.mockResolvedValue({ data: {} })

    expect(await isStoreAdmin('owner-1')).toBe(true)
    expect(updateById).toHaveBeenCalledWith('users', 'owner-1', { role: 'admin' })
  })

  it('isStoreAdmin: false for a plain customer (the BUYER)', async () => {
    const { isStoreAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'buyer-1', email: 'buyer@example.com', role: 'customer' })

    expect(await isStoreAdmin('buyer-1')).toBe(false)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('isStoreAdmin: false when the user no longer exists', async () => {
    const { isStoreAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue(null)

    expect(await isStoreAdmin('ghost')).toBe(false)
  })

  it('storeOrderMerchantAuthorizer: ALLOWS a store admin to drive any order', async () => {
    const { storeOrderMerchantAuthorizer } = await import('../order-authorizer.js')
    findById.mockResolvedValue({ id: 'admin-1', email: 'a@store.com', role: 'admin' })

    expect(await storeOrderMerchantAuthorizer(ORDER_ROW, 'admin-1')).toBe(true)
  })

  it('storeOrderMerchantAuthorizer: DENIES a buyer — even the order owner', async () => {
    const { storeOrderMerchantAuthorizer } = await import('../order-authorizer.js')
    findById.mockResolvedValue({ id: 'buyer-1', email: 'buyer@example.com', role: 'customer' })

    // ORDER_ROW.userId === 'buyer-1' (the order owner), yet the merchant gate
    // still denies — owning the order does not make you the merchant.
    expect(await storeOrderMerchantAuthorizer(ORDER_ROW, 'buyer-1')).toBe(false)
  })
})
