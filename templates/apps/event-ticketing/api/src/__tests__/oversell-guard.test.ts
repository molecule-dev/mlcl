import { beforeEach, describe, expect, it, vi } from 'vitest'

// fulfillOrder MUST increment ticket_tiers.quantity_sold when it issues tickets — the
// tier capacity check in POST / reads that column but nothing ever incremented it, so
// the cap was never enforced (unlimited oversell). The increment is an atomic
// conditional UPDATE so concurrent orders can't exceed quantity_total.

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

import { fulfillOrder } from '../handlers/orders.js'

describe('event-ticketing oversell guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.create.mockResolvedValue({ data: { id: 't-1' } })
    db.updateById.mockResolvedValue({ data: {} })
  })

  it('atomically claims tier capacity (conditional increment) when issuing tickets', async () => {
    db.findById.mockResolvedValueOnce({
      id: 'o1',
      status: 'pending',
      user_id: 'u1',
      event_id: 'e1',
      tier_id: 'tier-1',
      quantity: 2,
    })
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }) // claim succeeds

    await fulfillOrder('o1')

    // The capacity claim must be a conditional UPDATE guarded by quantity_total.
    const claim = db.query.mock.calls[0] as [string, unknown[]]
    expect(claim[0]).toMatch(/UPDATE ticket_tiers SET quantity_sold = quantity_sold \+ \$1/)
    expect(claim[0]).toMatch(/quantity_sold \+ \$1 <= quantity_total/)
    expect(claim[1]).toEqual([2, 'tier-1'])
    // Tickets issued after a successful claim.
    expect(db.create).toHaveBeenCalledTimes(2)
  })

  it('does NOT re-increment on a redelivered (already-paid) order', async () => {
    db.findById.mockResolvedValueOnce({ id: 'o2', status: 'paid', tier_id: 'tier-1', quantity: 2 })
    db.findMany.mockResolvedValueOnce([{ id: 't-a' }, { id: 't-b' }])

    await fulfillOrder('o2')

    expect(db.query).not.toHaveBeenCalled()
    expect(db.create).not.toHaveBeenCalled()
  })
})
