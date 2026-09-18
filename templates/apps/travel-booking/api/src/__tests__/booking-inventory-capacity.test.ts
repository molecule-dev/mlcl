import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// POST /bookings priced and persisted without ever checking room inventory or occupancy: a
// room_type row holds `total_rooms` physical units and a `capacity` max party size, but the
// handler read only price/property_id. So a single room booked unlimited times for the same
// dates, and a 10-guest party fit a capacity-2 room. The guard now counts active overlapping
// bookings against total_rooms and rejects guests > capacity.

const db = {
  findById: vi.fn(),
  findMany: vi.fn(async (..._a: unknown[]) => [] as unknown[]),
  create: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  idParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

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
  return {
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
}
const run = (
  res: ReturnType<typeof makeRes>,
  body: Record<string, unknown> = {
    room_id: 'room-1',
    check_in: '2026-08-01',
    check_out: '2026-08-05',
    guests: 2,
  },
) => createHandler()({ body } as unknown as Request, res as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue({
    id: 'room-1',
    property_id: 'p1',
    price_per_night_cents: 10000,
    capacity: 2,
    total_rooms: 3,
  })
  db.findMany.mockResolvedValue([])
  db.create.mockResolvedValue({ data: { id: 'b1' } })
})

describe('booking enforces capacity and inventory', () => {
  it('rejects a party larger than the room capacity (400, no create)', async () => {
    const res = makeRes()
    await run(res, {
      room_id: 'room-1',
      check_in: '2026-08-01',
      check_out: '2026-08-05',
      guests: 4,
    })
    expect(res.statusCode).toBe(400)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('allows a party within capacity and while units remain (201)', async () => {
    db.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]) // 2 of 3 units taken
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith(
      'travel_bookings',
      expect.objectContaining({ status: 'confirmed', room_type_id: 'room-1' }),
    )
  })

  it('rejects once every physical unit is booked for the window (409, no create)', async () => {
    db.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]) // 3 of 3 taken
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(409)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('counts only active bookings overlapping the requested window', async () => {
    const res = makeRes()
    await run(res)
    const call = (db.findMany.mock.calls[0] as unknown[])[1] as { where: unknown[] }
    expect(call.where).toEqual(
      expect.arrayContaining([
        { field: 'room_type_id', operator: '=', value: 'room-1' },
        { field: 'status', operator: 'in', value: ['confirmed', 'pending'] },
        { field: 'check_in', operator: '<', value: '2026-08-05' },
        { field: 'check_out', operator: '>', value: '2026-08-01' },
      ]),
    )
  })

  it('treats a room_type with no total_rooms as single-unit (2nd overlap → 409)', async () => {
    db.findById.mockResolvedValue({
      id: 'room-1',
      property_id: 'p1',
      price_per_night_cents: 10000,
      capacity: 4,
    })
    db.findMany.mockResolvedValue([{ id: 'a' }])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(409)
  })
})
