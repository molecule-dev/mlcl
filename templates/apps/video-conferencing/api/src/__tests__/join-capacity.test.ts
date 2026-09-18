import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Joining a meeting created a meeting_participants row unconditionally — the meeting's stored
// max_participants was never enforced (no count of active participants). Join now counts
// participants still in the meeting (left_at IS NULL) and rejects (403) when it's full, while
// letting someone who is already in reconnect.

const db = {
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn(async () => undefined) }))
vi.mock('@molecule/api-bonds-default-express', () => ({
  requireAuth: (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/participants.js'

function joinHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:meetingId/join' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:meetingId/join not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { locals: { session: { userId: 'me' } }, statusCode: 200, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(o: unknown) {
      res.body = o
      return res
    },
  }) as unknown as Response & { statusCode: number }
}
const run = (max: number, participants: Array<Record<string, unknown>>) => {
  db.findById.mockResolvedValue({ id: 'm1', max_participants: max })
  db.findMany.mockResolvedValue(participants)
  db.create.mockResolvedValue({ data: { id: 'p-new' } })
  const res = makeRes()
  const req = { params: { meetingId: 'm1' }, body: {} } as unknown as Request
  return joinHandler()(req, res).then(() => res)
}
const active = (user_id: string) => ({ user_id, left_at: null })
const gone = (user_id: string) => ({ user_id, left_at: '2026-01-01T00:00:00Z' })

beforeEach(() => vi.clearAllMocks())

describe('join enforces meeting capacity', () => {
  it('403s a new joiner when the meeting is at max_participants', async () => {
    const res = await run(2, [active('a'), active('b')])
    expect(res.statusCode).toBe(403)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('admits a joiner while a seat remains', async () => {
    const res = await run(2, [active('a')])
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledWith(
      'meeting_participants',
      expect.objectContaining({ user_id: 'me' }),
    )
  })

  it('lets an already-present participant reconnect even when full', async () => {
    const res = await run(2, [active('a'), active('me')])
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalled()
  })

  it('ignores participants who have left (left_at set) when counting capacity', async () => {
    const res = await run(2, [gone('a'), gone('b')])
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalled()
  })
})
