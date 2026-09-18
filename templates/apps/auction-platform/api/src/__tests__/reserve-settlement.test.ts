import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// An auction only SELLS when the top bid meets the seller's reserve_price. Settlement ignored the
// reserve, so a listing with a $50 top bid and a $1000 reserve settled 'sold', created a won order,
// and notified the bidder as winner. Below reserve it must end 'reserve_not_met' with no sale.

const db = {
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'seller-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-image', () => ({ resize: vi.fn() }))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-search', () => ({ deleteDocument: vi.fn(), index: vi.fn() }))

import router from '../handlers/listings.js'

function endHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/end' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/end not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response
const run = (listing: Record<string, unknown>) => {
  db.findById.mockResolvedValue({ id: 'L1', seller_id: 'seller-1', status: 'active', ...listing })
  return endHandler()({ params: { id: 'L1' } } as unknown as Request, makeRes())
}
const statusWritten = () =>
  (db.updateById.mock.calls[0]?.[2] as { status?: string } | undefined)?.status
const wonOrderCreated = () => db.create.mock.calls.some((c) => c[0] === 'won_orders')

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([]) // won_orders dedup: none yet
  db.updateById.mockResolvedValue({ data: { id: 'L1' } })
  db.create.mockResolvedValue({ data: { id: 'x' } })
})

describe('auction settlement enforces the reserve', () => {
  it('sells when the top bid meets the reserve', async () => {
    await run({
      bid_count: 3,
      current_price: 150000,
      reserve_price: 100000,
      highest_bidder_id: 'b1',
    })
    expect(statusWritten()).toBe('sold')
    expect(wonOrderCreated()).toBe(true)
  })

  it('does NOT sell when the top bid is below the reserve', async () => {
    await run({
      bid_count: 3,
      current_price: 50000,
      reserve_price: 100000,
      highest_bidder_id: 'b1',
    })
    expect(statusWritten()).toBe('reserve_not_met')
    expect(wonOrderCreated()).toBe(false)
  })

  it('sells with any bid when there is no reserve', async () => {
    await run({ bid_count: 2, current_price: 5000, reserve_price: null, highest_bidder_id: 'b1' })
    expect(statusWritten()).toBe('sold')
    expect(wonOrderCreated()).toBe(true)
  })

  it('cancels when there are no bids', async () => {
    await run({ bid_count: 0, current_price: 0, reserve_price: 100000, highest_bidder_id: null })
    expect(statusWritten()).toBe('cancelled')
    expect(wonOrderCreated()).toBe(false)
  })
})
