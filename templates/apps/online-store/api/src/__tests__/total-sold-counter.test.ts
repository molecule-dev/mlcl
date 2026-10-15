import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// products.total_sold drives GET /storefront/bestsellers (ORDER BY total_sold), but the checkout
// never incremented it, so the Bestsellers ranking stayed frozen at 0. Checkout must add each
// purchased quantity to total_sold (atomically, in the same transaction as the stock decrement).

const db = {
  findMany: vi.fn(),
  findById: vi.fn(),
  findOne: vi.fn(),
  deleteMany: vi.fn(),
  query: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  withTransaction: (fn: () => Promise<unknown>) => fn(),
  deleteMany: (...a: unknown[]) => db.deleteMany(...a),
  query: (...a: unknown[]) => db.query(...a),
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn().mockResolvedValue({}) }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-resource-order', () => ({
  canDriveOrderLifecycle: vi.fn(() => true),
  MERCHANT_STATES: ['confirmed', 'processing', 'shipped', 'delivered'],
}))

import router from '../handlers/orders.js'

function checkoutHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { locals: { session: { userId: 'u1' } }, statusCode: 200, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(o: unknown) {
      res.body = o
      return res
    },
  }) as unknown as Response
}

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([{ product_id: 'p1', quantity: 3, variant_id: null }]) // cart_items
  db.findById.mockImplementation((table: string) =>
    Promise.resolve(
      table === 'products'
        ? { id: 'p1', name: 'Widget', price: 1000, status: 'active' }
        : { id: 'u1', email: null },
    ),
  )
  db.findOne.mockResolvedValue({ available: 10 }) // inventory
  db.deleteMany.mockResolvedValue({})
  // The checkout's transaction queries.
  db.query.mockImplementation((sql: string) => {
    if (/UPDATE inventory/.test(sql))
      return Promise.resolve({ rowCount: 1, rows: [{ available: 7 }] })
    if (/INSERT INTO orders/.test(sql)) return Promise.resolve({ rows: [{ id: 'o1' }] })
    return Promise.resolve({ rowCount: 1, rows: [] })
  })
})

describe('checkout increments products.total_sold', () => {
  it('adds each purchased quantity to the product total_sold in the transaction', async () => {
    const res = makeRes()
    await checkoutHandler()(
      { body: { shippingAddress: { line1: 'x' } } } as unknown as Request,
      res,
    )
    const inc = db.query.mock.calls.find((c) =>
      /UPDATE products SET total_sold = total_sold \+ \$1/.test(String(c[0])),
    )
    expect(inc).toBeDefined()
    expect(inc?.[1]).toEqual([3, 'p1'])
    expect(res.statusCode).toBe(201)
  })
})
