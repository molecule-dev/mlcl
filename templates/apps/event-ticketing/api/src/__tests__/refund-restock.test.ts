import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Refunding a PAID order must reverse the fulfillment: give the seats back to the tier
// (decrement quantity_sold, which fulfillOrder incremented) and void the issued tickets
// (checkin.ts rejects ticket.status === 'refunded'). Otherwise refunded seats stay stranded
// as sold-out and the tickets remain valid for entry. A re-refund is idempotent.

const db = {
  findById: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  query: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  query: (...a: unknown[]) => db.query(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-payments-stripe', () => ({
  getClient: vi.fn(),
  verifyWebhookSignature: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: vi.fn(() => 'u1'),
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
  idParamSchema: {},
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

import router from '../handlers/orders.js'

function refundHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/refund' && l.route.methods.put)
  if (!layer?.route) throw new Error('PUT /:id/refund not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(b: unknown) {
      this.body = b
      return this
    },
  }
  return res
}
const run = (res: ReturnType<typeof makeRes>) =>
  refundHandler()({ params: { id: 'o1' } } as unknown as Request, res as unknown as Response)

// order 'o1' owned by organizer u1's event 'e1'
function mockOrder(status: string) {
  db.findById.mockImplementation(async (table: string, id: string) => {
    if (table === 'orders' && id === 'o1')
      return { id: 'o1', status, event_id: 'e1', tier_id: 'tier-1', quantity: 3, user_id: 'buyer' }
    if (table === 'events' && id === 'e1') return { id: 'e1', organizer_user_id: 'u1' }
    return null
  })
}
const tierUpdate = () =>
  (db.query.mock.calls as Array<[string, unknown[]]>).find(([sql]) =>
    /UPDATE ticket_tiers SET quantity_sold/.test(sql),
  )
const ticketVoid = () =>
  (db.query.mock.calls as Array<[string, unknown[]]>).find(([sql]) =>
    /UPDATE tickets SET status = 'refunded'/.test(sql),
  )

beforeEach(() => {
  vi.clearAllMocks()
  db.updateById.mockResolvedValue({ data: { id: 'o1', status: 'refunded' } })
})

describe('event-ticketing refund reverses fulfillment', () => {
  it('gives the seats back and voids the tickets for a PAID order', async () => {
    mockOrder('paid')
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(200)
    // quantity_sold decremented by the order quantity, clamped at 0.
    const tier = tierUpdate()
    expect(tier).toBeDefined()
    expect(tier?.[0]).toMatch(/GREATEST\(quantity_sold - \$1, 0\)/)
    expect(tier?.[1]).toEqual([3, 'tier-1'])
    // issued tickets voided so they can't check in.
    expect(ticketVoid()?.[1]).toEqual(['o1'])
    expect(db.updateById).toHaveBeenCalled()
  })

  it('is idempotent: a re-refund does NOT decrement again', async () => {
    mockOrder('refunded')
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(200)
    expect(db.query).not.toHaveBeenCalled()
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('does not touch inventory for a never-paid (pending) order', async () => {
    mockOrder('pending')
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(200)
    expect(db.query).not.toHaveBeenCalled()
    // still flips the order to refunded
    expect(db.updateById).toHaveBeenCalled()
  })
})
