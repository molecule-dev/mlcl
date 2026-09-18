import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A reschedule (changing start_at/end_at via PATCH /bookings/:id) must run the same overlap
// guard as create — otherwise an update could move a booking onto a taken slot, double-booking
// the host and bypassing the create-time check. The booking itself is excluded from its own
// conflict check.

const db = {
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
  findOne: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  count: (...a: unknown[]) => db.count(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
}))
vi.mock('@molecule/api-bond', () => ({
  get: () => null,
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  }),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'host-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-config', () => ({ get: (_k: string, d?: unknown) => d }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/bookings.js'

function patchHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id' && l.route.methods.patch)
  if (!layer?.route) throw new Error('PATCH /:id not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
    statusCode: 200,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json() {
      return this
    },
  }
  return res
}
const existing = {
  id: 'b1',
  host_user_id: 'host-1',
  start_at: '2026-07-01T10:00:00.000Z',
  end_at: '2026-07-01T10:30:00.000Z',
}
const run = (body: Record<string, unknown>, res: ReturnType<typeof makeRes>) =>
  patchHandler()({ params: { id: 'b1' }, body } as unknown as Request, res as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue(existing)
  db.updateById.mockResolvedValue({ data: { id: 'b1' } })
})

describe('booking reschedule overlap guard', () => {
  it('409s when the new window overlaps another scheduled booking (no write)', async () => {
    db.findMany.mockResolvedValue([{ id: 'other', host_user_id: 'host-1', status: 'scheduled' }])
    const res = makeRes()
    await run({ start_at: '2026-08-01T10:00:00.000Z', end_at: '2026-08-01T10:30:00.000Z' }, res)
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('reschedules when the new window is free (200)', async () => {
    db.findMany.mockResolvedValue([])
    const res = makeRes()
    await run({ start_at: '2026-08-01T10:00:00.000Z', end_at: '2026-08-01T10:30:00.000Z' }, res)
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalled()
  })

  it('skips the overlap check when start/end are unchanged (notes-only edit)', async () => {
    const res = makeRes()
    await run({ notes: 'call me first' }, res)
    expect(res.statusCode).toBe(200)
    expect(db.findMany).not.toHaveBeenCalled()
    expect(db.updateById).toHaveBeenCalled()
  })

  it('excludes the booking itself from its own conflict check', async () => {
    db.findMany.mockResolvedValue([{ id: 'b1', host_user_id: 'host-1', status: 'scheduled' }])
    const res = makeRes()
    await run({ start_at: '2026-08-01T10:00:00.000Z', end_at: '2026-08-01T10:30:00.000Z' }, res)
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalled()
  })
})
