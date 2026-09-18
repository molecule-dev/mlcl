/**
 * Order lifecycle authorization tests.
 *
 * Proves the M6-1 merchant gate end-to-end against the REAL
 * `@molecule/api-resource-order` contract (`canDriveOrderLifecycle` +
 * `BUYER_ALLOWED_TRANSITIONS`) wired through this app's registered merchant
 * authorizer (seller/vendor ownership, `bonds/resource-order.ts`):
 *
 *  - a MERCHANT (the user who owns the order's vendor) CAN ship/deliver/cancel,
 *  - a plain BUYER (order owner) is 403'd on those merchant ops,
 *  - a buyer may still cancel their OWN pending order (owner check),
 *  - a non-owner cannot cancel someone else's pending order,
 *  - and the whole thing FAILS CLOSED when no authorizer is registered.
 *
 * The order router runs on a real (ephemeral) Express server; only the data
 * layer + i18n + validation are mocked so the gate logic is exercised for real.
 */

import type { Server } from 'node:http'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setOrderMerchantAuthorizer } from '@molecule/api-resource-order'

import { setupResourceOrder } from '../bonds/resource-order.js'
import ordersRouter from '../handlers/orders.js'

// Mutable in-memory data layer, shared with the mocks below via vi.hoisted so
// each test can shape the order / order_items / vendors rows it needs.
const harness = vi.hoisted(() => {
  const db: {
    order: Record<string, unknown> | null
    orderItems: Array<Record<string, unknown>>
    vendors: Record<string, Record<string, unknown>>
  } = { order: null, orderItems: [], vendors: {} }
  return { db }
})

vi.mock('@molecule/api-database', () => ({
  findById: vi.fn(async (table: string, id: string) => {
    if (table === 'orders') return harness.db.order
    if (table === 'vendors') return harness.db.vendors[id] ?? null
    return null
  }),
  findMany: vi.fn(async (table: string) => (table === 'order_items' ? harness.db.orderItems : [])),
  findOne: vi.fn(async () => null),
  count: vi.fn(async () => 0),
  create: vi.fn(async () => ({ data: { id: 'evt-1' } })),
  deleteById: vi.fn(async () => ({ data: null })),
  updateById: vi.fn(async (_table: string, _id: string, data: Record<string, unknown>) => ({
    data: { ...(harness.db.order ?? {}), ...data },
  })),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? key,
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('../handlers/_seed.js', () => ({
  seedDemoForUser: vi.fn(async () => ({})),
  seedGlobalCatalogIfEmpty: vi.fn(async () => ({})),
  ensureDemoVendorOwnership: vi.fn(async () => {}),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  // Stand in for the real auth middleware: the test user is the x-test-user header.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const user = req.header('x-test-user')
    res.locals.session = user ? { userId: user } : undefined
    next()
  })
  app.use('/orders', ordersRouter)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
})

beforeEach(() => {
  // Default fixture: a CONFIRMED (progressed) order whose vendor is owned by
  // 'seller-1'; the buyer is 'buyer-1'. Re-register the authorizer each test
  // (one test clears it to assert fail-closed behavior).
  setupResourceOrder()
  harness.db.vendors = { 'vendor-1': { id: 'vendor-1', user_id: 'seller-1' } }
  harness.db.orderItems = [{ vendor_id: 'vendor-1' }]
  harness.db.order = {
    id: 'order-1',
    buyer_id: 'buyer-1',
    vendor_id: 'vendor-1',
    status: 'confirmed',
  }
})

async function putStatus(
  orderId: string,
  user: string | null,
  status: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (user) headers['x-test-user'] = user
  const res = await fetch(`${baseUrl}/orders/${orderId}/status`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ status }),
  })
  const body = (await res.json()) as Record<string, unknown>
  return { status: res.status, body }
}

const MERCHANT_403 = /Merchant authorization is required/i

describe('PUT /orders/:id/status — merchant gate (M6-1)', () => {
  it('merchant (vendor owner) CAN ship an order', async () => {
    const { status } = await putStatus('order-1', 'seller-1', 'shipped')
    expect(status).toBe(200)
  })

  it('merchant (vendor owner) CAN mark an order delivered', async () => {
    harness.db.order = {
      id: 'order-1',
      buyer_id: 'buyer-1',
      vendor_id: 'vendor-1',
      status: 'shipped',
    }
    const { status } = await putStatus('order-1', 'seller-1', 'delivered')
    expect(status).toBe(200)
  })

  it('buyer (order owner) is 403 merchantForbidden when shipping', async () => {
    const { status, body } = await putStatus('order-1', 'buyer-1', 'shipped')
    expect(status).toBe(403)
    expect(String(body.error)).toMatch(MERCHANT_403)
  })

  it('buyer (order owner) is 403 merchantForbidden when delivering', async () => {
    harness.db.order = {
      id: 'order-1',
      buyer_id: 'buyer-1',
      vendor_id: 'vendor-1',
      status: 'shipped',
    }
    const { status, body } = await putStatus('order-1', 'buyer-1', 'delivered')
    expect(status).toBe(403)
    expect(String(body.error)).toMatch(MERCHANT_403)
  })

  it('buyer CAN cancel their OWN pending order (owner check)', async () => {
    harness.db.order = {
      id: 'order-1',
      buyer_id: 'buyer-1',
      vendor_id: 'vendor-1',
      status: 'pending',
    }
    const { status } = await putStatus('order-1', 'buyer-1', 'cancelled')
    expect(status).toBe(200)
  })

  it("a non-owner CANNOT cancel someone else's pending order (403 forbidden)", async () => {
    harness.db.order = {
      id: 'order-1',
      buyer_id: 'buyer-1',
      vendor_id: 'vendor-1',
      status: 'pending',
    }
    const { status, body } = await putStatus('order-1', 'intruder', 'cancelled')
    expect(status).toBe(403)
    expect(String(body.error)).toBe('Forbidden')
  })

  it('cancelling an already-progressed order is merchant-only', async () => {
    // order is 'confirmed' (past pending): the buyer cannot self-cancel...
    const buyer = await putStatus('order-1', 'buyer-1', 'cancelled')
    expect(buyer.status).toBe(403)
    expect(String(buyer.body.error)).toMatch(MERCHANT_403)
    // ...but the merchant can.
    const merchant = await putStatus('order-1', 'seller-1', 'cancelled')
    expect(merchant.status).toBe(200)
  })

  it('fails CLOSED: with no authorizer registered, even the seller is denied', async () => {
    setOrderMerchantAuthorizer(null)
    const { status, body } = await putStatus('order-1', 'seller-1', 'shipped')
    expect(status).toBe(403)
    expect(String(body.error)).toMatch(MERCHANT_403)
  })
})
