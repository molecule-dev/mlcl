import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Occupancy guard: a room's stored `capacity` (max guests) must be enforced at booking time. The
// create path priced the stay and persisted `guests` without ever comparing it to room.capacity, so
// a party of 6 could book a room that holds 2. Only bookings within capacity may be created.

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
const run = (guests: number, capacity: number) => {
  db.findById.mockResolvedValue({
    id: 'room-1',
    hotel_id: 'h1',
    rate: 100,
    resort_fee: 0,
    capacity,
  })
  const res = makeRes()
  const body = { room_id: 'room-1', check_in: '2026-08-01', check_out: '2026-08-05', guests }
  return createHandler()({ body } as unknown as Request, res as unknown as Response).then(() => res)
}

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([]) // no conflicting reservations
  db.create.mockResolvedValue({ data: { id: 'r1' } })
})

describe('reservation occupancy (capacity) guard', () => {
  it('rejects a party larger than the room capacity (400, no create)', async () => {
    const res = await run(6, 2)
    expect(res.statusCode).toBe(400)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('allows a booking within capacity', async () => {
    const res = await run(2, 4)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith(
      'reservations',
      expect.objectContaining({ room_id: 'room-1', guests: 2 }),
    )
  })

  it('allows a booking exactly at capacity (boundary)', async () => {
    const res = await run(3, 3)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalled()
  })
})
