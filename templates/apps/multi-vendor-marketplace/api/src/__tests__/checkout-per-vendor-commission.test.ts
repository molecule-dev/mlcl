import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Checkout split the cart into one order per vendor but computed commission from a single global
// env rate, never reading the vendor's own commission_rate column — so a vendor's configured rate
// silently did nothing and every vendor was charged the same. The payout math must use the stored
// per-vendor rate (numeric column, which the pg driver returns as a string), env rate as fallback.

const db = {
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  create: vi.fn(),
  deleteById: vi.fn(),
  count: vi.fn(async (..._a: unknown[]) => 0),
  findOne: vi.fn(async (..._a: unknown[]) => null),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  count: (...a: unknown[]) => db.count(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('../handlers/_seed.js', () => ({
  seedDemoForUser: vi.fn(async () => ({})),
  seedGlobalCatalogIfEmpty: vi.fn(async () => ({})),
  ensureDemoVendorOwnership: vi.fn(async () => {}),
}))

import router from '../handlers/orders.js'

function checkoutHandler(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<void>
}
const makeRes = () => {
  const res = {
    locals: { session: { userId: 'buyer-1' } },
    statusCode: 200,
    body: undefined as unknown,
  }
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
const orderCreate = () =>
  db.create.mock.calls.find((c) => c[0] === 'orders')?.[1] as Record<string, unknown> | undefined
const commissionCreate = () =>
  db.create.mock.calls.find((c) => c[0] === 'commissions')?.[1] as
    Record<string, unknown> | undefined

// One vendor, one $1000 product, quantity 1 → subtotal 1000.
const run = (commission_rate: unknown) => {
  db.findMany.mockImplementation((table: unknown) =>
    Promise.resolve(
      table === 'cart_items'
        ? [{ id: 'ci1', product_id: 'p1', quantity: 1, user_id: 'buyer-1' }]
        : table === 'vendors'
          ? [{ id: 'v1' }] // v1 is active — checkout drops items from suspended/pending vendors
          : [],
    ),
  )
  db.findById.mockImplementation((table: unknown, id: unknown) => {
    if (table === 'products')
      return Promise.resolve({ id: 'p1', vendor_id: 'v1', price: 1000, name: 'Widget' })
    if (table === 'vendors')
      return Promise.resolve(id === 'v1' ? { id: 'v1', commission_rate } : null)
    return Promise.resolve(null)
  })
  db.create.mockResolvedValue({ data: { id: 'o1' } })
  db.deleteById.mockResolvedValue({ data: null })
  return checkoutHandler()({ body: {} } as unknown as Request, makeRes(), vi.fn() as NextFunction)
}

beforeEach(() => vi.clearAllMocks())

describe('checkout uses each vendor’s own commission_rate', () => {
  it('applies a 20% per-vendor rate to commission + payout', async () => {
    await run(0.2)
    expect(orderCreate()).toMatchObject({ commission: 200, vendor_payout: 800 })
    expect(commissionCreate()).toMatchObject({ amount: 200, payout_amount: 800 })
  })

  it('parses a numeric commission_rate returned as a string (pg numeric)', async () => {
    await run('0.1500')
    expect(orderCreate()?.commission).toBe(150)
  })

  it('honors a 0% commission vendor (full payout)', async () => {
    await run(0)
    expect(orderCreate()).toMatchObject({ commission: 0, vendor_payout: 1000 })
  })

  it('falls back to the env/default rate when the vendor has no commission_rate', async () => {
    await run(undefined) // → default 0.08 → round(1000 × 0.08) = 80
    expect(orderCreate()?.commission).toBe(80)
  })
})
