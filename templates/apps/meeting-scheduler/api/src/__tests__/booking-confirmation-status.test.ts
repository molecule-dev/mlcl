import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The event type's requires_confirmation flag was stored and displayed but the public booking path
// hardcoded status:'scheduled', so no booking ever became 'pending' — leaving the whole
// awaiting-confirmation UI (dashboard KPI, bookings/calendar) dead. A booking on a
// requires_confirmation event type now starts 'pending' (host approves via PATCH /:id); otherwise
// it stays 'scheduled'.

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
const START = '2035-08-01T10:00:00.000Z'
const body = {
  event_type_slug: 'intro',
  invitee_name: 'Ann',
  invitee_email: 'a@b.com',
  start_at: START,
}
const run = (res: ReturnType<typeof makeRes>) =>
  publicCreate()({ body } as unknown as Request, res as unknown as Response)

const eventType = (requiresConfirmation: boolean) => ({
  id: 'et-1',
  owner_id: 'host-1',
  slug: 'intro',
  duration_minutes: 30,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  min_notice_minutes: 0,
  max_per_day: null,
  requires_confirmation: requiresConfirmation,
  location_kind: 'jitsi',
  is_active: true,
})

beforeEach(() => {
  vi.clearAllMocks()
  db.findMany.mockResolvedValue([]) // no overlap
  db.count.mockResolvedValue(0)
  db.create.mockResolvedValue({ data: { id: 'b1' } })
  db.findById.mockResolvedValue({ id: 'host-1', email: 'host@x.com' })
})

describe('public booking honors requires_confirmation', () => {
  it("creates a 'pending' booking when the event type requires confirmation", async () => {
    db.findOne.mockResolvedValue(eventType(true))
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith(
      'bookings',
      expect.objectContaining({ status: 'pending' }),
    )
  })

  it("creates a 'scheduled' booking when confirmation is not required", async () => {
    db.findOne.mockResolvedValue(eventType(false))
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith(
      'bookings',
      expect.objectContaining({ status: 'scheduled' }),
    )
  })
})
