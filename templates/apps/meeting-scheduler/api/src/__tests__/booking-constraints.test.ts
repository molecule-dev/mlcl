import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The event type's buffer_before/after and max_per_day were stored but ignored on the public
// booking path: bookings could be made back-to-back (no buffer gap) and past the daily cap. The
// conflict window is now padded by the buffers, and the per-day cap is enforced.

const db = {
  findById: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  count: (...a: unknown[]) => db.count(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
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

function publicCreate(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/public' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /public not found')
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
const START = '2035-08-01T10:00:00.000Z' // start + 30m dur = 10:30; buffers 15m → padded 09:45..10:45
const body = {
  event_type_slug: 'intro',
  invitee_name: 'Ann',
  invitee_email: 'a@b.com',
  start_at: START,
}
const run = (res: ReturnType<typeof makeRes>) =>
  publicCreate()({ body } as unknown as Request, res as unknown as Response)

const eventType = (maxPerDay: number | null) => ({
  id: 'et-1',
  owner_id: 'host-1',
  slug: 'intro',
  duration_minutes: 30,
  buffer_before_minutes: 15,
  buffer_after_minutes: 15,
  min_notice_minutes: 0,
  max_per_day: maxPerDay,
  location_kind: 'jitsi',
  is_active: true,
})

beforeEach(() => {
  vi.clearAllMocks()
  db.findOne.mockResolvedValue(eventType(null))
  db.findMany.mockResolvedValue([]) // no overlap
  db.count.mockResolvedValue(0)
  db.create.mockResolvedValue({ data: { id: 'b1' } })
  db.findById.mockResolvedValue({ id: 'host-1', email: 'host@x.com' })
})

describe('public booking enforces event-type constraints', () => {
  it('pads the conflict window by the buffers', async () => {
    await run(makeRes())
    const overlap = db.findMany.mock.calls.find((c) => c[0] === 'bookings')
    const where = (
      overlap?.[1] as { where: Array<{ field: string; operator: string; value: unknown }> }
    ).where
    const startLt = where.find((w) => w.field === 'start_at' && w.operator === '<')?.value
    const endGt = where.find((w) => w.field === 'end_at' && w.operator === '>')?.value
    expect(startLt).toBe('2035-08-01T10:45:00.000Z') // end (10:30) + 15m buffer_after
    expect(endGt).toBe('2035-08-01T09:45:00.000Z') // start (10:00) - 15m buffer_before
  })

  it('409s when the day is at max_per_day (no create)', async () => {
    db.findOne.mockResolvedValue(eventType(2))
    db.count.mockResolvedValue(2)
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(409)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('allows the booking when under max_per_day', async () => {
    db.findOne.mockResolvedValue(eventType(2))
    db.count.mockResolvedValue(1)
    const res = makeRes()
    await run(res)
    expect(db.create).toHaveBeenCalledWith(
      'bookings',
      expect.objectContaining({ event_type_id: 'et-1' }),
    )
  })
})
