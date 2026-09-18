import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// pet-care is a request→confirm marketplace: overlapping REQUESTS are allowed (the sitter
// arbitrates), but confirming a request that overlaps a booking the sitter has ALREADY
// confirmed would double-book them. The confirm handler must reject that.

const db = {
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  findOne: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'sitter-user-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/bookings.js'

function confirmHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/confirm' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/confirm not found')
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
const booking = (status: string) => ({
  id: 'b1',
  sitter_id: 's1',
  status,
  starts_at: '2026-08-01T10:00:00.000Z',
  ends_at: '2026-08-01T12:00:00.000Z',
})
const run = (res: ReturnType<typeof makeRes>) =>
  confirmHandler()({ params: { id: 'b1' } } as unknown as Request, res as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockImplementation(async (table: string) =>
    table === 'sitters' ? { id: 's1', user_id: 'sitter-user-1' } : booking('requested'),
  )
  db.updateById.mockResolvedValue({ data: { id: 'b1', status: 'confirmed' } })
})

describe('pet-care confirm — no double-booking a sitter', () => {
  it('409s confirming a request that overlaps an already-confirmed booking (no write)', async () => {
    db.findMany.mockResolvedValue([{ id: 'other', sitter_id: 's1', status: 'confirmed' }])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('confirms when no confirmed booking overlaps (200)', async () => {
    db.findMany.mockResolvedValue([])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledWith('bookings', 'b1', { status: 'confirmed' })
  })

  it('ignores the booking itself when checking overlaps (self is not a conflict)', async () => {
    // findMany returns only THIS booking (id b1) — must not be treated as a conflict.
    db.findMany.mockResolvedValue([{ id: 'b1', sitter_id: 's1', status: 'confirmed' }])
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalled()
  })

  it('is idempotent for an already-confirmed booking (no overlap query, no write)', async () => {
    db.findById.mockImplementation(async (table: string) =>
      table === 'sitters' ? { id: 's1', user_id: 'sitter-user-1' } : booking('confirmed'),
    )
    const res = makeRes()
    await run(res)
    expect(res.statusCode).toBe(200)
    expect(db.findMany).not.toHaveBeenCalled()
    expect(db.updateById).not.toHaveBeenCalled()
  })
})
