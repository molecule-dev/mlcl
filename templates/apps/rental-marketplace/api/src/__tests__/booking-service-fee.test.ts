import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A listing carries its own service_fee_rate (per-listing column, default 0.12), but the booking
// charge hardcoded 0.12 — so a host's configured rate never affected the total. The charge must now
// read the listing's service_fee_rate.

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
function makeRes(): { statusCode: number; body: unknown } & Pick<Response, 'status' | 'json'> {
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
  return res as unknown as { statusCode: number; body: unknown } & Pick<Response, 'status' | 'json'>
}

// 4 nights (Aug 1 → Aug 5) at $100/night = $400 subtotal, cleaning fee 0.
const run = (res: ReturnType<typeof makeRes>): Promise<void> =>
  createHandler()(
    {
      body: { listing_id: 'L1', check_in: '2026-08-01', check_out: '2026-08-05', guests: 2 },
    } as unknown as Request,
    res as unknown as Response,
  )

function persistedServiceFee(): number {
  const call = db.create.mock.calls.find((c) => c[0] === 'bookings')
  const meta = JSON.parse((call?.[1] as { metadata: string }).metadata) as { serviceFee: number }
  return meta.serviceFee
}

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([])
  db.create.mockResolvedValue({ data: { id: 'b1' } })
})

describe('booking charge honors the listing service_fee_rate', () => {
  it('applies a non-default rate (0.20 → $80 on a $400 subtotal)', async () => {
    db.findById.mockResolvedValue({
      id: 'L1',
      host_id: 'host-1',
      max_guests: 4,
      price_per_night: 100,
      cleaning_fee: 0,
      service_fee_rate: 0.2,
    })
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(persistedServiceFee()).toBe(80)
  })

  it('falls back to 0.12 when the listing has no service_fee_rate ($48 on $400)', async () => {
    db.findById.mockResolvedValue({
      id: 'L1',
      host_id: 'host-1',
      max_guests: 4,
      price_per_night: 100,
      cleaning_fee: 0,
    })
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(persistedServiceFee()).toBe(48)
  })
})
