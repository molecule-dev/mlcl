import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A tutor must not be double-booked: creating a session must reject when the tutor already
// has a CONFIRMED session overlapping the requested window. Bookings store scheduled_at +
// duration_hours (no end column), so the overlap is computed in JS over a bounded candidate
// set. Overlapping pending requests are fine; only a confirmed session blocks.

const db = { findById: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'student-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn().mockResolvedValue({ messageId: 'x' }) }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
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
// New booking: 14:00–15:00.
const body = {
  tutor_id: 't1',
  scheduled_at: '2026-08-01T14:00:00.000Z',
  duration_hours: 1,
  payment_intent_id: 'pi_1',
}
const run = (res: ReturnType<typeof makeRes>) =>
  createHandler()({ body } as unknown as Request, res as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue({ id: 't1', user_id: 'tutor-user', hourly_rate: 50 })
  db.create.mockResolvedValue({ data: { id: 'bk-1' } })
})

describe('tutor double-booking guard (create)', () => {
  it('409s when a confirmed session overlaps the requested window (no create)', async () => {
    // Existing confirmed 14:30–15:30 overlaps 14:00–15:00.
    db.findMany.mockResolvedValue([
      { scheduled_at: '2026-08-01T14:30:00.000Z', duration_hours: 1, status: 'confirmed' },
    ])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(409)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('creates the booking when the tutor is free (201)', async () => {
    db.findMany.mockResolvedValue([])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith('bookings', expect.objectContaining({ tutor_id: 't1' }))
  })

  it('allows a back-to-back session that ends exactly when the new one starts (201)', async () => {
    // Existing confirmed 13:00–14:00 touches but does not overlap 14:00–15:00.
    db.findMany.mockResolvedValue([
      { scheduled_at: '2026-08-01T13:00:00.000Z', duration_hours: 1, status: 'confirmed' },
    ])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalled()
  })
})
