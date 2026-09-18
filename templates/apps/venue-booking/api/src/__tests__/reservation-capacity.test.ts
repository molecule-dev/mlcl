import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A venue's stored `capacity` (max occupancy) must be enforced at booking time. The reservation
// create path priced the stay and persisted guest_count without ever comparing it to venue.capacity,
// so a party larger than the venue holds was silently accepted.

const db = {
  findById: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  create: (...a: unknown[]) => db.create(...a),
  count: (...a: unknown[]) => db.count(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  idParamSchema: {},
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/reservations.js'

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
const makeRes = () => {
  const res = { statusCode: 200, body: undefined as unknown }
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
const run = (guest_count: number | undefined, capacity: number) => {
  db.findById.mockResolvedValue({ id: 'v1', capacity, hourly_rate_cents: 10000 })
  const res = makeRes()
  const body = {
    venue_id: 'v1',
    starts_at_iso: '2026-08-01T10:00:00Z',
    ends_at_iso: '2026-08-01T14:00:00Z',
    guest_count,
  }
  return createHandler()({ body } as unknown as Request, res).then(
    () => res as unknown as { statusCode: number },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'b1' } })
  db.findMany.mockResolvedValue([]) // no overlapping bookings by default
})

describe('reservation occupancy (capacity) guard', () => {
  it('rejects a party larger than the venue capacity (400, no create)', async () => {
    const res = await run(200, 60)
    expect(res.statusCode).toBe(400)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('allows a booking within capacity', async () => {
    await run(40, 60)
    expect(db.create).toHaveBeenCalled()
  })

  it('allows a booking with no guest_count', async () => {
    await run(undefined, 60)
    expect(db.create).toHaveBeenCalled()
  })
})
