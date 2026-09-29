import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Operators are identified by `role` in these tests (allow-list left empty), so
// the predicate is deterministic and independent of any env wiring.
process.env.ADMIN_EMAILS = ''

// The handler 404s any non-UUID :id by design (a malformed id must never reach
// Postgres as a uuid literal), so the fixture order carries a real UUID.
const ORDER_ID = '6f1c2a3e-9b4d-4c8a-a1b2-3c4d5e6f7a8b'

// --- Database mock -----------------------------------------------------------
const findById = vi.fn()
const updateById = vi.fn()
const create = vi.fn()
const findMany = vi.fn()
const deleteById = vi.fn()

vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => findById(...args),
  updateById: (...args: unknown[]) => updateById(...args),
  create: (...args: unknown[]) => create(...args),
  findMany: (...args: unknown[]) => findMany(...args),
  deleteById: (...args: unknown[]) => deleteById(...args),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// `getUserId` returns whichever caller the test is exercising; `getParamId`
// always resolves the single fixture order.
let currentUserId: string | undefined
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUserId,
  getParamId: () => ORDER_ID,
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

// Faithful test double of the order resource's merchant-authorizer registry.
// The real 3-function mechanism lives in @molecule/api-resource-order and is
// covered by that package's own suite; here we re-implement the same default-DENY
// gate so we can register the app's REAL authorizer and drive the order handlers
// through it end-to-end (handler -> canDriveOrderLifecycle -> authorizer ->
// isStoreOperator -> users row).
let registeredAuthorizer:
  ((row: unknown, userId: string, req?: unknown) => boolean | Promise<boolean>) | null = null
vi.mock('@molecule/api-resource-order', () => ({
  setOrderMerchantAuthorizer: (fn: typeof registeredAuthorizer) => {
    registeredAuthorizer = fn
  },
  getOrderMerchantAuthorizer: () => registeredAuthorizer,
  canDriveOrderLifecycle: async (row: unknown, userId: string, req?: unknown) =>
    registeredAuthorizer ? registeredAuthorizer(row, userId, req) : false,
}))

type MockRes = Response & { statusCode?: number; body?: Record<string, unknown> }

const makeRes = (): MockRes => {
  const res = { locals: {} } as unknown as MockRes
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

const makeReq = (body: Record<string, unknown> = {}): Request =>
  ({ body, params: { id: ORDER_ID } }) as unknown as Request

/** Wire findById to serve the fixture order + a small users table. */
function seedDb(order: Record<string, unknown> | null, users: Record<string, StoreUserRow>): void {
  findById.mockImplementation(async (table: string, id: string) => {
    if (table === 'orders') return order
    if (table === 'users') return users[id] ?? null
    if (table === 'delivery_slots') return null
    return null
  })
  findMany.mockResolvedValue([])
  updateById.mockImplementation(
    async (_table: string, _id: string, patch: Record<string, unknown>) => ({
      data: { ...(order ?? {}), ...patch },
    }),
  )
  create.mockResolvedValue({ data: { id: 'evt-1' } })
}

/** Like seedDb but also serves a delivery_slots fixture (for capacity-restore tests). */
function seedDbWithSlot(
  order: Record<string, unknown> | null,
  users: Record<string, StoreUserRow>,
  slot: Record<string, unknown> | null,
): void {
  findById.mockImplementation(async (table: string, id: string) => {
    if (table === 'orders') return order
    if (table === 'users') return users[id] ?? null
    if (table === 'delivery_slots') return slot
    return null
  })
  findMany.mockResolvedValue([])
  updateById.mockImplementation(
    async (_table: string, _id: string, patch: Record<string, unknown>) => ({
      data: { ...(order ?? {}), ...patch },
    }),
  )
  create.mockResolvedValue({ data: { id: 'evt-1' } })
}

interface StoreUserRow {
  id: string
  role?: string
  email?: string
}

const BUYER: StoreUserRow = { id: 'buyer-1', role: 'customer', email: 'shopper@example.com' }
const INTRUDER: StoreUserRow = { id: 'intruder-1', role: 'customer', email: 'other@example.com' }
const OPERATOR: StoreUserRow = { id: 'op-1', role: 'admin', email: 'owner@grocer.com' }

const MERCHANT_FORBIDDEN = 'Merchant authorization is required to manage this order'
const OWNER_FORBIDDEN = 'You do not have access to this order'

// Imported lazily inside each test so the mocked modules are evaluated AFTER the
// top-level vi.fn mocks are initialized (mirrors require-admin.test.ts).
async function loadHandlers() {
  return import('../handlers/orders.js')
}

async function registerRealAuthorizer() {
  const { isStoreOperator } = await import('../lib/store-operator.js')
  const { setOrderMerchantAuthorizer } = await import('@molecule/api-resource-order')
  // EXACTLY the registration setupBonds() performs.
  setOrderMerchantAuthorizer((_orderRow, userId) => isStoreOperator(userId))
}

describe('orders — merchant authorization (M6-1)', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    currentUserId = undefined
    registeredAuthorizer = null
    await registerRealAuthorizer()
  })

  describe('refund (always merchant-only)', () => {
    it('403s a plain buyer (the order owner) with merchantForbidden', async () => {
      seedDb(
        { id: ORDER_ID, user_id: 'buyer-1', status: 'delivered', total: 1999 },
        {
          'buyer-1': BUYER,
        },
      )
      currentUserId = 'buyer-1'
      const { refundHandler } = await loadHandlers()
      const res = makeRes()

      await refundHandler(makeReq({}), res)

      expect(res.statusCode).toBe(403)
      expect(res.body?.error).toBe(MERCHANT_FORBIDDEN)
      // No refund mutation happened.
      expect(updateById).not.toHaveBeenCalledWith('orders', ORDER_ID, expect.anything())
    })

    it('lets a store operator (merchant) refund any order', async () => {
      seedDb(
        { id: ORDER_ID, user_id: 'buyer-1', status: 'delivered', total: 1999 },
        {
          'op-1': OPERATOR,
        },
      )
      currentUserId = 'op-1'
      const { refundHandler } = await loadHandlers()
      const res = makeRes()

      await refundHandler(makeReq({ amount: 1999 }), res)

      expect(res.statusCode).toBeUndefined()
      expect(res.body).toMatchObject({ refunded: true, amount: 1999 })
      expect(updateById).toHaveBeenCalledWith(
        'orders',
        ORDER_ID,
        expect.objectContaining({ status: 'refunded' }),
      )
    })

    it('fails CLOSED: even an operator is 403d when NO authorizer is registered', async () => {
      const { setOrderMerchantAuthorizer } = await import('@molecule/api-resource-order')
      setOrderMerchantAuthorizer(null)
      seedDb(
        { id: ORDER_ID, user_id: 'buyer-1', status: 'delivered', total: 1999 },
        {
          'op-1': OPERATOR,
        },
      )
      currentUserId = 'op-1'
      const { refundHandler } = await loadHandlers()
      const res = makeRes()

      await refundHandler(makeReq({}), res)

      expect(res.statusCode).toBe(403)
      expect(res.body?.error).toBe(MERCHANT_FORBIDDEN)
    })
  })

  describe('updateStatus — merchant lifecycle vs buyer cancel', () => {
    it('403s a buyer driving a forward/merchant status (delivered) with merchantForbidden', async () => {
      seedDb(
        { id: ORDER_ID, user_id: 'buyer-1', status: 'on_the_way', total: 1999 },
        {
          'buyer-1': BUYER,
        },
      )
      currentUserId = 'buyer-1'
      const { updateStatusHandler } = await loadHandlers()
      const res = makeRes()

      await updateStatusHandler(makeReq({ status: 'delivered' }), res)

      expect(res.statusCode).toBe(403)
      expect(res.body?.error).toBe(MERCHANT_FORBIDDEN)
      expect(updateById).not.toHaveBeenCalled()
    })

    it('lets a store operator drive a forward status (delivered)', async () => {
      seedDb(
        { id: ORDER_ID, user_id: 'buyer-1', status: 'on_the_way', total: 1999 },
        {
          'op-1': OPERATOR,
        },
      )
      currentUserId = 'op-1'
      const { updateStatusHandler } = await loadHandlers()
      const res = makeRes()

      await updateStatusHandler(makeReq({ status: 'delivered' }), res)

      expect(res.statusCode).toBeUndefined()
      expect(updateById).toHaveBeenCalledWith(
        'orders',
        ORDER_ID,
        expect.objectContaining({ status: 'delivered' }),
      )
    })

    it('lets a buyer cancel their OWN still-pending order (no merchant needed)', async () => {
      seedDb(
        { id: ORDER_ID, user_id: 'buyer-1', status: 'pending', total: 1999 },
        {
          'buyer-1': BUYER,
        },
      )
      currentUserId = 'buyer-1'
      const { updateStatusHandler } = await loadHandlers()
      const res = makeRes()

      await updateStatusHandler(makeReq({ status: 'cancelled' }), res)

      expect(res.statusCode).toBeUndefined()
      expect(updateById).toHaveBeenCalledWith(
        'orders',
        ORDER_ID,
        expect.objectContaining({ status: 'cancelled' }),
      )
    })

    it('403s a non-owner cancelling someone else’s pending order with the owner-check key', async () => {
      seedDb(
        { id: ORDER_ID, user_id: 'buyer-1', status: 'pending', total: 1999 },
        {
          'intruder-1': INTRUDER,
        },
      )
      currentUserId = 'intruder-1'
      const { updateStatusHandler } = await loadHandlers()
      const res = makeRes()

      await updateStatusHandler(makeReq({ status: 'cancelled' }), res)

      expect(res.statusCode).toBe(403)
      expect(res.body?.error).toBe(OWNER_FORBIDDEN)
      expect(updateById).not.toHaveBeenCalled()
    })

    it('403s a buyer cancelling an already-progressed order (merchant-only) with merchantForbidden', async () => {
      seedDb(
        { id: ORDER_ID, user_id: 'buyer-1', status: 'confirmed', total: 1999 },
        {
          'buyer-1': BUYER,
        },
      )
      currentUserId = 'buyer-1'
      const { updateStatusHandler } = await loadHandlers()
      const res = makeRes()

      await updateStatusHandler(makeReq({ status: 'cancelled' }), res)

      expect(res.statusCode).toBe(403)
      expect(res.body?.error).toBe(MERCHANT_FORBIDDEN)
      expect(updateById).not.toHaveBeenCalled()
    })

    it('lets a store operator cancel a progressed order', async () => {
      seedDb(
        { id: ORDER_ID, user_id: 'buyer-1', status: 'confirmed', total: 1999 },
        {
          'op-1': OPERATOR,
        },
      )
      currentUserId = 'op-1'
      const { updateStatusHandler } = await loadHandlers()
      const res = makeRes()

      await updateStatusHandler(makeReq({ status: 'cancelled' }), res)

      expect(res.statusCode).toBeUndefined()
      expect(updateById).toHaveBeenCalledWith(
        'orders',
        ORDER_ID,
        expect.objectContaining({ status: 'cancelled' }),
      )
    })
  })

  // Checkout decrements delivery_slots.remaining_capacity by 1 per order. A cancel/refund must
  // give that unit back, or the slot stays permanently consumed and reads "full" with no live
  // orders. Restore is idempotent (guarded on the prior status) and clamped at the slot ceiling.
  describe('delivery-slot capacity restore on cancel/refund', () => {
    const SLOT = { id: 'slot-1', capacity: 5, remaining_capacity: 4 }
    const slotUpdate = () =>
      (updateById.mock.calls as Array<[string, string, Record<string, unknown>]>).find(
        ([table]) => table === 'delivery_slots',
      )

    it('returns one unit of capacity when an operator cancels a confirmed order', async () => {
      seedDbWithSlot(
        {
          id: ORDER_ID,
          user_id: 'buyer-1',
          status: 'confirmed',
          total: 1999,
          delivery_slot_id: 'slot-1',
        },
        { 'op-1': OPERATOR },
        SLOT,
      )
      currentUserId = 'op-1'
      const { updateStatusHandler } = await loadHandlers()
      await updateStatusHandler(makeReq({ status: 'cancelled' }), makeRes())
      expect(slotUpdate()?.[2]).toMatchObject({ remaining_capacity: 5 })
    })

    it('returns capacity when an operator refunds an order', async () => {
      seedDbWithSlot(
        {
          id: ORDER_ID,
          user_id: 'buyer-1',
          status: 'delivered',
          total: 1999,
          delivery_slot_id: 'slot-1',
        },
        { 'op-1': OPERATOR },
        SLOT,
      )
      currentUserId = 'op-1'
      const { refundHandler } = await loadHandlers()
      await refundHandler(makeReq({ amount: 1999 }), makeRes())
      expect(slotUpdate()?.[2]).toMatchObject({ remaining_capacity: 5 })
    })

    it('does NOT double-free: refunding an already-cancelled order leaves capacity untouched', async () => {
      seedDbWithSlot(
        {
          id: ORDER_ID,
          user_id: 'buyer-1',
          status: 'cancelled',
          total: 1999,
          delivery_slot_id: 'slot-1',
        },
        { 'op-1': OPERATOR },
        SLOT,
      )
      currentUserId = 'op-1'
      const { refundHandler } = await loadHandlers()
      await refundHandler(makeReq({ amount: 1999 }), makeRes())
      expect(slotUpdate()).toBeUndefined()
    })

    it('clamps at the slot ceiling (never exceeds capacity)', async () => {
      seedDbWithSlot(
        {
          id: ORDER_ID,
          user_id: 'buyer-1',
          status: 'confirmed',
          total: 1999,
          delivery_slot_id: 'slot-1',
        },
        { 'op-1': OPERATOR },
        { id: 'slot-1', capacity: 5, remaining_capacity: 5 },
      )
      currentUserId = 'op-1'
      const { updateStatusHandler } = await loadHandlers()
      await updateStatusHandler(makeReq({ status: 'cancelled' }), makeRes())
      expect(slotUpdate()?.[2]).toMatchObject({ remaining_capacity: 5 })
    })
  })
})
