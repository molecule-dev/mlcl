import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A listing's max_guests capacity was stored (and used for search + the client picker) but the
// booking API accepted any party size — a direct POST could overbook. Creating a booking must now
// reject when the requested guest count exceeds the listing's max_guests.

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

function createHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    locals: { session: { userId: 'guest-1' } },
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
const run = (guests: number, res: ReturnType<typeof makeRes>) =>
  createHandler()(
    {
      body: {
        listing_id: 'L1',
        check_in: '2026-08-01',
        check_out: '2026-08-05',
        guests,
      },
    } as unknown as Request,
    res as unknown as Response,
  )

beforeEach(() => {
  vi.clearAllMocks()
  // Listing owned by someone else, capacity 2.
  db.findById.mockResolvedValue({
    id: 'L1',
    host_id: 'host-1',
    max_guests: 2,
    price_per_night: 100,
    cleaning_fee: 0,
  })
  db.create.mockResolvedValue({ data: { id: 'b1' } })
})

describe('booking enforces listing max_guests', () => {
  it('400s a booking whose guest count exceeds max_guests (no booking created)', async () => {
    const res = makeRes()
    await run(5, res)
    expect(res.statusCode).toBe(400)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('creates a booking at exactly max_guests', async () => {
    const res = makeRes()
    await run(2, res)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith(
      'bookings',
      expect.objectContaining({ status: 'pending' }),
    )
  })
})
