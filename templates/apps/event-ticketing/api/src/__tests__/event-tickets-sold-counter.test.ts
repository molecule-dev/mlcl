import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The event-level sold counter (events.tickets_sold) drives the sold-out / remaining indicator on the
// event list, landing, and dashboard cards. It was hardcoded 0 at creation and never maintained by
// fulfillment (only the sibling ticket_tiers.quantity_sold was), so the indicator was permanently
// "available". fulfillOrder must increment it, and a refund must give the seats back.

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
  getUserId: vi.fn(() => 'org1'),
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
  idParamSchema: {},
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

import router, { fulfillOrder } from '../handlers/orders.js'

/** All query() SQL strings issued during the call, for order-independent matching. */
const sqlCalls = () => db.query.mock.calls.map((c) => String(c[0]))
const callMatching = (re: RegExp) =>
  db.query.mock.calls.find((c) => re.test(String(c[0]))) as [string, unknown[]] | undefined

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
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 't-1' } })
  db.updateById.mockResolvedValue({ data: {} })
  db.query.mockResolvedValue({ rows: [], rowCount: 1 })
})

describe('event-ticketing tickets_sold counter', () => {
  it('fulfillOrder increments events.tickets_sold by the order quantity', async () => {
    db.findById.mockResolvedValueOnce({
      id: 'o1',
      status: 'pending',
      user_id: 'u1',
      event_id: 'e1',
      tier_id: 'tier-1',
      quantity: 2,
    })
    await fulfillOrder('o1')
    const call = callMatching(/UPDATE events SET tickets_sold = tickets_sold \+ \$1/)
    expect(call).toBeDefined()
    expect(call?.[1]).toEqual([2, 'e1'])
  })

  it('increments the event counter even for a tier-less order', async () => {
    db.findById.mockResolvedValueOnce({
      id: 'o3',
      status: 'pending',
      user_id: 'u1',
      event_id: 'e1',
      tier_id: null,
      quantity: 3,
    })
    await fulfillOrder('o3')
    // No tier UPDATE (tier_id null), but the event counter still moves.
    expect(sqlCalls().some((s) => /UPDATE ticket_tiers/.test(s))).toBe(false)
    const call = callMatching(/UPDATE events SET tickets_sold = tickets_sold \+ \$1/)
    expect(call?.[1]).toEqual([3, 'e1'])
  })

  it('does NOT touch the counter on a redelivered (already-paid) order', async () => {
    db.findById.mockResolvedValueOnce({ id: 'o2', status: 'paid', event_id: 'e1', quantity: 2 })
    db.findMany.mockResolvedValueOnce([{ id: 't-a' }, { id: 't-b' }])
    await fulfillOrder('o2')
    expect(db.query).not.toHaveBeenCalled()
  })

  it('refund gives the seats back (clamped) at the event level', async () => {
    db.findById
      .mockResolvedValueOnce({
        id: 'o1',
        status: 'paid',
        event_id: 'e1',
        tier_id: 'tier-1',
        quantity: 2,
      })
      .mockResolvedValueOnce({ id: 'e1', organizer_user_id: 'org1' })
    await refundHandler()({ params: { id: 'o1' } } as unknown as Request, makeRes())
    const call = callMatching(/UPDATE events SET tickets_sold = GREATEST\(tickets_sold - \$1, 0\)/)
    expect(call).toBeDefined()
    expect(call?.[1]).toEqual([2, 'e1'])
  })
})
