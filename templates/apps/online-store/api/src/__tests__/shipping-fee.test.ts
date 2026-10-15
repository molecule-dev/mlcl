import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The store owner configures shipping (adminSettings.shipping: freeShippingThreshold +
// standardRate) but checkout charged NO shipping and the cart returned none, so the client
// fell back to a hardcoded rate that matched neither the config nor the amount charged.
// resolveShipping is the shared helper the cart total (display) and the order total (charge)
// now both use. Monetary values in this store are CENTS; the admin config is whole dollars.

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

import cartRouter from '../handlers/cart.js'
import ordersRouter from '../handlers/orders.js'
import { resolveShipping } from '../lib/shipping.js'

describe('resolveShipping (cents; admin config is whole dollars)', () => {
  const owner = {
    oauthData: { adminSettings: { shipping: { freeShippingThreshold: 75, standardRate: 5.99 } } },
  }

  it('charges the configured standard rate (in cents) below the threshold', () => {
    expect(resolveShipping(owner, 5000)).toBe(599) // $50 < $75 → round($5.99 → 599¢)
  })

  it('is free at/above the configured threshold', () => {
    expect(resolveShipping(owner, 7500)).toBe(0) // $75 >= $75
    expect(resolveShipping(owner, 12000)).toBe(0)
  })

  it('parses a JSON-string oauthData (JSONB round-trips as text)', () => {
    const stringly = { oauthData: JSON.stringify(owner.oauthData) }
    expect(resolveShipping(stringly, 5000)).toBe(599)
  })

  it('treats a 0 threshold as free-shipping-for-all (not unset)', () => {
    const freeForAll = { oauthData: { adminSettings: { shipping: { freeShippingThreshold: 0 } } } }
    expect(resolveShipping(freeForAll, 100)).toBe(0)
  })

  it('treats a 0 standard rate as free (not unset)', () => {
    const zeroRate = {
      oauthData: { adminSettings: { shipping: { freeShippingThreshold: 75, standardRate: 0 } } },
    }
    expect(resolveShipping(zeroRate, 100)).toBe(0)
  })

  it('falls back to $75 threshold / $5.99 rate when unknown or unconfigured', () => {
    expect(resolveShipping(null, 1000)).toBe(599) // $10 < $75 → 599¢
    expect(resolveShipping(null, 8000)).toBe(0) // $80 >= $75
    expect(resolveShipping({ oauthData: {} }, 1000)).toBe(599)
    expect(resolveShipping({ oauthData: { adminSettings: { shipping: {} } } }, 1000)).toBe(599)
  })
})

function routeHandler(
  router: typeof cartRouter,
  path: string,
  method: 'get' | 'post',
): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === path && l.route.methods[method])
  if (!layer?.route) throw new Error(`${method.toUpperCase()} ${path} not found`)
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
  }) as unknown as Response & { statusCode: number; body: Record<string, number> }
}

describe('GET /cart returns the resolved shipping + total', () => {
  beforeEach(() => vi.clearAllMocks())

  it('adds the owner-configured shipping to the cart total', async () => {
    db.findMany.mockResolvedValue([{ product_id: 'p1', quantity: 2 }]) // cart_items
    db.findById.mockImplementation((table: string, id: string) => {
      if (table === 'products') return Promise.resolve({ id: 'p1', price: 1000, user_id: 'owner1' })
      if (table === 'users' && id === 'owner1')
        return Promise.resolve({
          id: 'owner1',
          oauthData: {
            adminSettings: { shipping: { freeShippingThreshold: 75, standardRate: 5.99 } },
          },
        })
      return Promise.resolve(null)
    })
    const res = makeRes()
    await routeHandler(cartRouter, '/', 'get')({} as unknown as Request, res)
    // subtotal $20 (2000¢) < $75 → shipping 599¢; tax 8% default = 160¢; total = 2000+160+599.
    expect(res.body.subtotal).toBe(2000)
    expect(res.body.shipping).toBe(599)
    expect(res.body.total).toBe(2759)
  })
})

describe('POST /orders persists the shipping in the charged total', () => {
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

  it('inserts shipping and folds it into the order total', async () => {
    const res = makeRes()
    await routeHandler(
      ordersRouter,
      '/',
      'post',
    )({ body: { shippingAddress: { line1: 'x' } } } as unknown as Request, res)
    expect(res.statusCode).toBe(201)
    const insert = db.query.mock.calls.find((c) => /INSERT INTO orders/.test(String(c[0])))
    expect(insert).toBeDefined()
    // params: [userId, status, subtotal, tax, shipping, total, ...]
    // subtotal $30 (3000¢) < $75 → shipping 599¢; tax 8% default = 240¢; total = 3000+240+599.
    const params = insert?.[1] as unknown[]
    expect(params[2]).toBe(3000) // subtotal
    expect(params[3]).toBe(240) // tax
    expect(params[4]).toBe(599) // shipping
    expect(params[5]).toBe(3839) // total = subtotal + tax + shipping
  })
})
