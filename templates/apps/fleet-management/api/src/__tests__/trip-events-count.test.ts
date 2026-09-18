import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The trip list returned every trip with events=0 (shapeTrip hardcoded it), even though the
// trip_events table is populated via POST /trips/:id/events. The list now counts each trip's events
// with one grouped query so the per-row "Events" column + header badge reflect reality.

const db = {
  findMany: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-resource-user', () => ({
  authorizers: { auth: () => (_req: Request, _res: Response, next: () => void) => next() },
}))
vi.mock('../handlers/_seed.js', () => ({ seedDemoForUser: vi.fn(async () => undefined) }))
vi.mock('../lib/authz.js', () => ({
  requireOwnership: vi.fn(),
  requireParentOwnership: vi.fn(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/trips.js'

function listHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = {
    locals: { session: { userId: 'u1' } },
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
  return res as unknown as Response & { statusCode: number; body: unknown }
}

type Where = Array<{ field: string; operator: string; value: unknown }>

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockImplementation(async (table: string) => {
    if (table === 'trips')
      return [
        { id: 't1', vehicle_id: 'v1', driver_id: 'd1' },
        { id: 't2', vehicle_id: 'v1', driver_id: 'd1' },
      ]
    if (table === 'vehicles') return [{ id: 'v1', license_plate: 'ABC-123' }]
    if (table === 'drivers') return [{ id: 'd1', name: 'Sam' }]
    if (table === 'trip_events') return [{ trip_id: 't1' }, { trip_id: 't1' }, { trip_id: 't1' }]
    return []
  })
})

describe('trip list surfaces the real trip_events count', () => {
  it('counts events per trip (3 for t1, 0 for t2)', async () => {
    const res = makeRes()
    await listHandler()({ query: {} } as unknown as Request, res)
    expect(res.statusCode).toBe(200)
    const rows = res.body as Array<{ id: string; events: number }>
    expect(rows.find((r) => r.id === 't1')?.events).toBe(3)
    expect(rows.find((r) => r.id === 't2')?.events).toBe(0)
  })

  it('queries trip_events with an IN over the page’s trip ids', async () => {
    const res = makeRes()
    await listHandler()({ query: {} } as unknown as Request, res)
    const call = db.findMany.mock.calls.find((c) => c[0] === 'trip_events')
    expect(call, 'trip_events must be queried').toBeDefined()
    const where = (call?.[1] as { where?: Where }).where
    expect(where).toEqual([{ field: 'trip_id', operator: 'in', value: ['t1', 't2'] }])
  })
})
