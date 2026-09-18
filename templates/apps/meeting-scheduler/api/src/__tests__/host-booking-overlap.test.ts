import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The authenticated host booking-create path (POST /) must apply the SAME overlap guard as
// the public invitee path (POST /public): a host cannot double-book their own calendar with
// a booking that overlaps an existing scheduled one. Without it, the authenticated path
// silently bypassed the conflict check.

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

function hostCreate(): (req: Request, res: Response) => Promise<void> {
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
const body = {
  event_type_id: 'et-1',
  invitee_name: 'Ann',
  invitee_email: 'a@b.com',
  start_at: '2026-08-01T10:00:00Z',
  end_at: '2026-08-01T10:30:00Z',
}
const run = (res: ReturnType<typeof makeRes>) =>
  hostCreate()({ body } as unknown as Request, res as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue({
    id: 'et-1',
    owner_id: 'host-1',
    duration_minutes: 30,
    location_kind: 'jitsi',
  })
  db.create.mockResolvedValue({ data: { id: 'b1' } })
})

describe('host booking-create overlap guard', () => {
  it('409s when the new booking overlaps an existing scheduled one (no create)', async () => {
    db.findMany.mockResolvedValue([{ id: 'existing', host_user_id: 'host-1', status: 'scheduled' }])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(409)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('creates the booking when the host calendar is free (201)', async () => {
    db.findMany.mockResolvedValue([])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith(
      'bookings',
      expect.objectContaining({ host_user_id: 'host-1' }),
    )
  })
})
