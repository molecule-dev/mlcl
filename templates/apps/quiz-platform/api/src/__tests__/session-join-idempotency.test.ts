import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A player double-clicking Join, reconnecting, or replaying the request must not create
// a duplicate session_participants row — that would show them twice in the lobby +
// leaderboard and split their score. The /join handler checks for an existing
// (session_id, user_id) row BEFORE the status gate, so an already-joined player can also
// reconnect after the quiz has started. Backed by the UNIQUE (session_id, user_id) constraint.

const db = { findById: vi.fn(), findOne: vi.fn(), create: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: vi.fn(),
  updateById: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn(), sendTo: vi.fn() }))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/sessions.js'

function joinHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/join' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/join not found')
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
const req = { params: { id: 'sess-1' }, body: { nickname: 'Ann' } } as unknown as Request

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue({ id: 'sess-1', status: 'waiting', host_id: 'host-1' })
  db.create.mockResolvedValue({ data: { id: 'p-new', session_id: 'sess-1', user_id: 'user-1' } })
})

describe('quiz session join — idempotent (no duplicate participant)', () => {
  it('returns the existing participant (200) without creating when already joined', async () => {
    db.findOne.mockResolvedValue({
      id: 'p-existing',
      session_id: 'sess-1',
      user_id: 'user-1',
      score: 3,
    })
    const res = makeRes()
    await joinHandler()(req, res as unknown as Response)
    expect(res.statusCode).toBe(200)
    expect((res.body as { id: string }).id).toBe('p-existing')
    expect(db.create).not.toHaveBeenCalled()
  })

  it('creates a participant (201) on a first join', async () => {
    db.findOne.mockResolvedValue(null)
    const res = makeRes()
    await joinHandler()(req, res as unknown as Response)
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledTimes(1)
    expect(db.create.mock.calls[0][0]).toBe('session_participants')
  })

  it('lets an already-joined player reconnect even after the quiz has started', async () => {
    // Status gate would 409 a NEW join, but the idempotent check runs first.
    db.findById.mockResolvedValue({ id: 'sess-1', status: 'active', host_id: 'host-1' })
    db.findOne.mockResolvedValue({ id: 'p-existing', session_id: 'sess-1', user_id: 'user-1' })
    const res = makeRes()
    await joinHandler()(req, res as unknown as Response)
    expect(res.statusCode).toBe(200)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('still rejects a brand-new join once the session is no longer waiting (409)', async () => {
    db.findById.mockResolvedValue({ id: 'sess-1', status: 'active', host_id: 'host-1' })
    db.findOne.mockResolvedValue(null)
    const res = makeRes()
    await joinHandler()(req, res as unknown as Response)
    expect(res.statusCode).toBe(409)
    expect(db.create).not.toHaveBeenCalled()
  })
})
