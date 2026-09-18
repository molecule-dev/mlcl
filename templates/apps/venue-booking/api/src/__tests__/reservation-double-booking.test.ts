import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The double-booking overlap guard existed only in the sibling /api/bookings route, but the UI
// books via /api/reservations — which priced and confirmed the reservation without ever querying
// existing bookings for a time conflict. So the same venue could be confirmed twice for overlapping
// times. The reservation create path now runs the same overlap check before persisting.

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
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1', idParamSchema: {} }))
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
const run = (overlapping: unknown[]) => {
  db.findById.mockResolvedValue({ id: 'v1', capacity: 100, hourly_rate_cents: 10000 })
  db.findMany.mockResolvedValue(overlapping)
  const res = makeRes()
  const body = {
    venue_id: 'v1',
    starts_at_iso: '2026-08-01T10:00:00Z',
    ends_at_iso: '2026-08-01T14:00:00Z',
    guest_count: 20,
  }
  return createHandler()({ body } as unknown as Request, res).then(
    () => res as unknown as { statusCode: number },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'b1' } })
})

describe('reservation double-booking guard', () => {
  it('rejects a reservation overlapping an active booking (409, no create)', async () => {
    const res = await run([{ id: 'existing', resourceId: 'v1' }])
    expect(res.statusCode).toBe(409)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('creates when no active booking overlaps (free venue)', async () => {
    const res = await run([])
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith(
      'bookings',
      expect.objectContaining({ resourceId: 'v1' }),
    )
  })

  it('checks only pending/confirmed bookings with the correct overlap window', async () => {
    await run([])
    const call = db.findMany.mock.calls.find((c) => c[0] === 'bookings')
    const where = (call?.[1] as { where: unknown[] }).where
    expect(where).toEqual(
      expect.arrayContaining([
        { field: 'resourceType', operator: '=', value: 'venue' },
        { field: 'resourceId', operator: '=', value: 'v1' },
        { field: 'status', operator: 'in', value: ['pending', 'confirmed'] },
        { field: 'startTime', operator: '<', value: '2026-08-01T14:00:00Z' },
        { field: 'endTime', operator: '>', value: '2026-08-01T10:00:00Z' },
      ]),
    )
  })
})
