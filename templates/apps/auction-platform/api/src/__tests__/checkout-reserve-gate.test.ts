import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Settlement refuses to sell below reserve (status -> 'reserve_not_met', no won order). But the
// checkout path only rejected `status === 'active'`, so a reserve_not_met listing whose
// highest_bidder_id still pointed at the top bidder passed the guard — ensureWonOrder minted a
// below-reserve order and pay completed the sale, defeating the reserve. Checkout must require a
// genuinely SOLD listing.

const db = { findById: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'winner-1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-payments-stripe', () => ({
  getClient: () => ({}),
  verifyWebhookSignature: vi.fn(),
}))

import router from '../handlers/checkout.js'

function route(
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
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(o: unknown) {
      this.body = o
      return this
    },
  }
  return res as unknown as Response & { statusCode: number; body: unknown }
}
const wonOrderCreated = () => db.create.mock.calls.some((c) => c[0] === 'won_orders')
const listing = (status: string) => ({
  id: 'L1',
  status,
  highest_bidder_id: 'winner-1',
  seller_id: 's1',
  current_price: 5000,
  title: 'Rare lot',
  category: 'art',
})

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([])
  db.create.mockResolvedValue({ data: { id: 'wo-new', status: 'pending_payment' } })
})

describe('checkout is gated on a genuinely sold listing (reserve honored)', () => {
  it('GET checkout 403s a reserve_not_met listing for the top bidder, with no won order minted', async () => {
    db.findById.mockImplementation(async (table: string, id: string) =>
      table === 'listings' ? listing('reserve_not_met') : { id, name: 'Seller' },
    )
    const res = makeRes()
    await route('/:id', 'get')({ params: { id: 'L1' } } as unknown as Request, res)
    expect(res.statusCode).toBe(403)
    expect(wonOrderCreated()).toBe(false)
  })

  it('POST pay 403s a reserve_not_met listing (no won order, never reaches Stripe)', async () => {
    db.findById.mockImplementation(async (table: string, id: string) =>
      table === 'listings' ? listing('reserve_not_met') : { id, name: 'Buyer' },
    )
    const res = makeRes()
    await route('/:id/pay', 'post')({ params: { id: 'L1' }, body: {} } as unknown as Request, res)
    expect(res.statusCode).toBe(403)
    expect(wonOrderCreated()).toBe(false)
  })

  it('GET checkout admits the winner of a genuinely sold listing', async () => {
    db.findById.mockImplementation(async (table: string, id: string) =>
      table === 'listings' ? listing('sold') : { id, name: 'Seller' },
    )
    db.findMany.mockResolvedValue([{ id: 'wo1', status: 'pending_payment' }])
    const res = makeRes()
    await route('/:id', 'get')({ params: { id: 'L1' } } as unknown as Request, res)
    expect(res.statusCode).toBe(200)
  })
})
