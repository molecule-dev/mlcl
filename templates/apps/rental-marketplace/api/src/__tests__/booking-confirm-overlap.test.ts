import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// rental-marketplace is a request→confirm model. Confirming a booking records a host_payout,
// so the confirm handler must (1) be idempotent — re-confirming must NOT record a second
// payout — and (2) refuse to confirm a booking that overlaps one already confirmed for the
// same listing (double-booking the listing).

const db = {
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  count: (...a: unknown[]) => db.count(...a),
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('../handlers/_decorate.js', () => ({
  decorateBooking: (x: unknown) => x,
  decorateBookings: (x: unknown) => x,
}))
vi.mock('../handlers/_seed.js', () => ({ seedDemoForUser: vi.fn().mockResolvedValue(undefined) }))

import router from '../handlers/bookings.js'

function confirmHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/confirm' && l.route.methods.put)
  if (!layer?.route) throw new Error('PUT /:id/confirm not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    locals: { session: { userId: 'host-1' } },
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(o: unknown) {
      this.body = o
      return this
    },
  }
  return res
}
const booking = (status: string) => ({
  id: 'b1',
  resourceType: 'listing',
  resourceId: 'L1',
  status,
  startTime: '2026-08-01T15:00:00.000Z',
  endTime: '2026-08-05T11:00:00.000Z',
  metadata: JSON.stringify({ hostId: 'host-1', subtotal: 100, serviceFee: 12 }),
})
const run = (res: ReturnType<typeof makeRes>) =>
  confirmHandler()({ params: { id: 'b1' } } as unknown as Request, res as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockImplementation(async (table: string) =>
    table === 'listings' ? { id: 'L1', host_id: 'host-1' } : booking('pending'),
  )
  db.updateById.mockResolvedValue({ data: booking('confirmed') })
  db.create.mockResolvedValue({ data: { id: 'payout-1' } })
})

describe('rental confirm — no double-booking, no duplicate payout', () => {
  it('409s confirming a booking that overlaps a confirmed one (no write, no payout)', async () => {
    db.findMany.mockResolvedValue([{ id: 'other', resourceId: 'L1', status: 'confirmed' }])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
    expect(db.create).not.toHaveBeenCalled()
  })

  it('confirms + records one payout when the dates are free (200)', async () => {
    db.findMany.mockResolvedValue([])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledWith(
      'bookings',
      'b1',
      expect.objectContaining({ status: 'confirmed' }),
    )
    expect(db.create).toHaveBeenCalledWith(
      'host_payouts',
      expect.objectContaining({ booking_id: 'b1' }),
    )
  })

  it('is idempotent for an already-confirmed booking — no second payout', async () => {
    db.findById.mockImplementation(async (table: string) =>
      table === 'listings' ? { id: 'L1', host_id: 'host-1' } : booking('confirmed'),
    )
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(200)
    expect(db.updateById).not.toHaveBeenCalled()
    expect(db.create).not.toHaveBeenCalled()
  })

  it('passes the cleaning fee through to the host payout', async () => {
    const withCleaning = {
      ...booking('pending'),
      metadata: JSON.stringify({
        hostId: 'host-1',
        subtotal: 100,
        serviceFee: 12,
        cleaningFee: 25,
      }),
    }
    db.findById.mockImplementation(async (table: string) =>
      table === 'listings' ? { id: 'L1', host_id: 'host-1' } : withCleaning,
    )
    db.findMany.mockResolvedValue([])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(200)
    // Host receives subtotal + cleaningFee − serviceFee = 100 + 25 − 12 = 113; only the platform's
    // service fee is withheld, and the cleaning fee (host revenue) is no longer kept by the platform.
    expect(db.create).toHaveBeenCalledWith(
      'host_payouts',
      expect.objectContaining({ amount: 113, service_fee: 12 }),
    )
  })
})
