import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Double-booking guard: creating a reservation must reject when an active (non-cancelled)
// reservation for the same room overlaps the requested nights. The overlap predicate
// (existing.check_in < new.check_out AND existing.check_out > new.check_in) is the crux —
// a wrong direction would silently oversell the room.

const db = { findById: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  getParamId: (req: Request) => req.params.id,
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
vi.mock('../handlers/_seed.js', () => ({ seedDemoForUser: vi.fn().mockResolvedValue(undefined) }))

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
function makeRes() {
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
  return res
}
const body = { room_id: 'room-1', check_in: '2026-08-01', check_out: '2026-08-05', guests: 2 }
const run = (res: ReturnType<typeof makeRes>) =>
  createHandler()({ body } as unknown as Request, res as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue({ id: 'room-1', hotel_id: 'h1', rate: 100, resort_fee: 0 })
  db.create.mockResolvedValue({ data: { id: 'r1' } })
})

describe('reservation double-booking guard', () => {
  it('rejects a room already booked for overlapping dates (409, no create)', async () => {
    db.findMany.mockResolvedValue([{ id: 'existing', room_id: 'room-1' }])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(409)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('creates a confirmed reservation when the room is free (201)', async () => {
    db.findMany.mockResolvedValue([])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith(
      'reservations',
      expect.objectContaining({ status: 'confirmed', room_id: 'room-1' }),
    )
  })

  it('checks only non-cancelled reservations with the correct overlap window', async () => {
    db.findMany.mockResolvedValue([])
    const res = makeRes()
    await run(res)
    const where = (db.findMany.mock.calls[0] as unknown[])[1] as { where: unknown[] }
    expect(where.where).toEqual(
      expect.arrayContaining([
        { field: 'room_id', operator: '=', value: 'room-1' },
        { field: 'status', operator: 'in', value: ['confirmed', 'pending'] },
        { field: 'check_in', operator: '<', value: '2026-08-05' },
        { field: 'check_out', operator: '>', value: '2026-08-01' },
      ]),
    )
  })

  it('allows a multi-unit room type while units remain (total_rooms 3, 2 overlaps → 201)', async () => {
    db.findById.mockResolvedValue({
      id: 'room-1',
      hotel_id: 'h1',
      rate: 100,
      resort_fee: 0,
      total_rooms: 3,
    })
    db.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalled()
  })

  it('rejects once every unit of a multi-unit type is booked (total_rooms 3, 3 overlaps → 409)', async () => {
    db.findById.mockResolvedValue({
      id: 'room-1',
      hotel_id: 'h1',
      rate: 100,
      resort_fee: 0,
      total_rooms: 3,
    })
    db.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(409)
    expect(db.create).not.toHaveBeenCalled()
  })
})
