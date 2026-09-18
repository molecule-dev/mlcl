import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'
import type { OrderRow } from '@molecule/api-resource-order'
import {
  cancel,
  refund,
  setOrderMerchantAuthorizer,
  updateStatus,
} from '@molecule/api-resource-order'

import { setupOrderMerchantAuthorizer } from '../order-merchant-authorizer.js'

// vi.hoisted runs before the SUT imports above are evaluated, so set the admin
// allow-list (read at require-admin module-eval time) and build the DB mocks
// here — proving the order authorizer reuses the FULL admin mechanism, including
// the ADMIN_EMAILS owner path + lazy role promotion.
const { mockFindById, mockUpdateById, mockCreate, mockFindMany } = vi.hoisted(() => {
  process.env.ADMIN_EMAILS = 'owner@box.com'
  return {
    mockFindById: vi.fn(),
    mockUpdateById: vi.fn(),
    mockCreate: vi.fn(),
    mockFindMany: vi.fn(),
  }
})

vi.mock('@molecule/api-database', () => ({
  findById: mockFindById,
  updateById: mockUpdateById,
  create: mockCreate,
  findMany: mockFindMany,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// ---- Fixtures --------------------------------------------------------------

// 'admin-1' is the store admin (the merchant); 'owner-1' is an ADMIN_EMAILS
// owner (a customer-role row the gate lazily promotes); 'buyer-1' / 'buyer-2'
// are plain customers (buyers).
const users: Record<string, { id: string; email: string; role: string }> = {
  'admin-1': { id: 'admin-1', email: 'staff@box.com', role: 'admin' },
  'owner-1': { id: 'owner-1', email: 'Owner@Box.com', role: 'customer' },
  'buyer-1': { id: 'buyer-1', email: 'buyer1@example.com', role: 'customer' },
  'buyer-2': { id: 'buyer-2', email: 'buyer2@example.com', role: 'customer' },
}

function orderRow(id: string, userId: string, status: OrderRow['status']): OrderRow {
  return {
    id,
    userId,
    status,
    subtotal: 100,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 100,
    shippingAddress: null,
    billingAddress: null,
    paymentId: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

// Every order is owned by a BUYER (buyer-1, except the not-yours case: buyer-2).
const orders: Record<string, OrderRow> = {
  'ord-delivered': orderRow('ord-delivered', 'buyer-1', 'delivered'),
  'ord-processing': orderRow('ord-processing', 'buyer-1', 'processing'),
  'ord-shipped': orderRow('ord-shipped', 'buyer-1', 'shipped'),
  'ord-confirmed': orderRow('ord-confirmed', 'buyer-1', 'confirmed'),
  'ord-pending': orderRow('ord-pending', 'buyer-1', 'pending'),
  'ord-pending-2': orderRow('ord-pending-2', 'buyer-2', 'pending'),
}

// ---- Framework-agnostic request/response doubles (no Express needed) --------

interface Captured {
  statusCode: number
  body: unknown
}

function makeRes(userId: string): { res: MoleculeResponse; captured: Captured } {
  const captured: Captured = { statusCode: 200, body: undefined }
  const res: MoleculeResponse = {
    status(code: number) {
      captured.statusCode = code
      return this
    },
    json(body: unknown) {
      captured.body = body
    },
    send(body: unknown) {
      captured.body = body
    },
    end() {},
    set() {},
    setHeader() {},
    cookie() {},
    write() {
      return true
    },
    locals: { session: { userId } },
  }
  return { res, captured }
}

function makeReq(orderId: string, body: unknown = {}): MoleculeRequest {
  return { params: { id: orderId }, body, query: {}, headers: {} }
}

function bodyOf(captured: Captured): Record<string, unknown> {
  return (captured.body ?? {}) as Record<string, unknown>
}

type Handler = (req: MoleculeRequest, res: MoleculeResponse) => Promise<void>

async function run(
  handler: Handler,
  orderId: string,
  userId: string,
  body: unknown = {},
): Promise<Captured> {
  const { res, captured } = makeRes(userId)
  await handler(makeReq(orderId, body), res)
  return captured
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindById.mockImplementation(async (table: string, id: string) => {
    if (table === 'users') return users[id] ?? null
    if (table === 'orders') return orders[id] ?? null
    return null
  })
  mockUpdateById.mockResolvedValue({ data: { ok: true } })
  mockCreate.mockResolvedValue({ data: { id: 'evt-1' } })
  mockFindMany.mockResolvedValue([])
  // Each test starts with the app's real authorizer registered.
  setupOrderMerchantAuthorizer()
})

afterAll(() => {
  // Don't leak the registered authorizer into other suites in this process.
  setOrderMerchantAuthorizer(null)
})

describe('order merchant authorizer (M6-1) — subscription-box single-merchant model', () => {
  describe('refund — always merchant-only (owner check removed)', () => {
    it('403s the BUYER (order owner) — a buyer cannot refund their own order', async () => {
      const c = await run(refund, 'ord-delivered', 'buyer-1')
      expect(c.statusCode).toBe(403)
      expect(bodyOf(c).errorKey).toBe('order.error.merchantForbidden')
      // No refund occurred.
      expect(mockUpdateById).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('allows the store ADMIN (the merchant) to refund', async () => {
      const c = await run(refund, 'ord-delivered', 'admin-1')
      expect(c.statusCode).toBe(200)
      expect(bodyOf(c).status).toBe('refunded')
      expect(mockUpdateById).toHaveBeenCalledWith(
        'orders',
        'ord-delivered',
        expect.objectContaining({ status: 'refunded' }),
      )
    })

    it('allows an ADMIN_EMAILS owner (reuses the full admin gate incl. lazy promotion)', async () => {
      const c = await run(refund, 'ord-delivered', 'owner-1')
      expect(c.statusCode).toBe(200)
      expect(bodyOf(c).status).toBe('refunded')
      // The order authorizer routes through require-admin's owner promotion.
      expect(mockUpdateById).toHaveBeenCalledWith('users', 'owner-1', { role: 'admin' })
    })

    it('fails closed: 403 even for an admin when NO authorizer is registered', async () => {
      setOrderMerchantAuthorizer(null)
      const c = await run(refund, 'ord-delivered', 'admin-1')
      expect(c.statusCode).toBe(403)
      expect(bodyOf(c).errorKey).toBe('order.error.merchantForbidden')
      expect(mockUpdateById).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })

  describe('updateStatus — transitions into a merchant state are merchant-only', () => {
    it('403s the BUYER trying to ship (processing -> shipped)', async () => {
      const c = await run(updateStatus, 'ord-processing', 'buyer-1', { status: 'shipped' })
      expect(c.statusCode).toBe(403)
      expect(bodyOf(c).errorKey).toBe('order.error.merchantForbidden')
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('allows the ADMIN to ship (processing -> shipped)', async () => {
      const c = await run(updateStatus, 'ord-processing', 'admin-1', { status: 'shipped' })
      expect(c.statusCode).toBe(200)
      expect(bodyOf(c).status).toBe('shipped')
    })

    it('allows the ADMIN to deliver (shipped -> delivered)', async () => {
      const c = await run(updateStatus, 'ord-shipped', 'admin-1', { status: 'delivered' })
      expect(c.statusCode).toBe(200)
      expect(bodyOf(c).status).toBe('delivered')
    })

    it('403s the BUYER trying to confirm their OWN pending order (merchant-only)', async () => {
      const c = await run(updateStatus, 'ord-pending', 'buyer-1', { status: 'confirmed' })
      expect(c.statusCode).toBe(403)
      expect(bodyOf(c).errorKey).toBe('order.error.merchantForbidden')
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('allows the ADMIN to confirm a pending order (pending -> confirmed)', async () => {
      const c = await run(updateStatus, 'ord-pending', 'admin-1', { status: 'confirmed' })
      expect(c.statusCode).toBe(200)
      expect(bodyOf(c).status).toBe('confirmed')
    })
  })

  describe('cancel — buyer self-service only while pending', () => {
    it('allows the BUYER to cancel their OWN pending order', async () => {
      const c = await run(cancel, 'ord-pending', 'buyer-1')
      expect(c.statusCode).toBe(200)
      expect(bodyOf(c).status).toBe('cancelled')
      expect(mockUpdateById).toHaveBeenCalledWith(
        'orders',
        'ord-pending',
        expect.objectContaining({ status: 'cancelled' }),
      )
    })

    it('allows the BUYER to cancel their OWN pending order via updateStatus too', async () => {
      const c = await run(updateStatus, 'ord-pending', 'buyer-1', { status: 'cancelled' })
      expect(c.statusCode).toBe(200)
      expect(bodyOf(c).status).toBe('cancelled')
    })

    it("403s (forbidden, NOT merchantForbidden) a buyer cancelling someone ELSE's pending order", async () => {
      const c = await run(cancel, 'ord-pending-2', 'buyer-1')
      expect(c.statusCode).toBe(403)
      // Owner-check failure uses the existing key, distinct from the merchant key.
      expect(bodyOf(c).errorKey).toBe('order.error.forbidden')
      expect(mockUpdateById).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('403s the BUYER cancelling an already-progressed (confirmed) order — merchant-only', async () => {
      const c = await run(cancel, 'ord-confirmed', 'buyer-1')
      expect(c.statusCode).toBe(403)
      expect(bodyOf(c).errorKey).toBe('order.error.merchantForbidden')
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('allows the ADMIN to cancel an already-progressed (confirmed) order', async () => {
      const c = await run(cancel, 'ord-confirmed', 'admin-1')
      expect(c.statusCode).toBe(200)
      expect(bodyOf(c).status).toBe('cancelled')
    })
  })
})
