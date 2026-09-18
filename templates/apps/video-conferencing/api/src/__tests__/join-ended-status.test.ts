import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The join handler enforced max_participants but never read the meeting's stored status, so a
// meeting the host had ENDED could still be joined. Join now rejects (409) when status === 'ended'.

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
const run = (status: string) => {
  db.findById.mockResolvedValue({ id: 'm1', status, max_participants: 0 })
  db.findMany.mockResolvedValue([])
  db.create.mockResolvedValue({ data: { id: 'p-new' } })
  const res = makeRes()
  const req = { params: { meetingId: 'm1' }, body: {} } as unknown as Request
  return joinHandler()(req, res).then(() => res)
}

beforeEach(() => vi.clearAllMocks())

describe('join honors the meeting status', () => {
  it('409s a join to an ended meeting and creates no participant', async () => {
    const res = await run('ended')
    expect(res.statusCode).toBe(409)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('admits a join to a live or scheduled meeting', async () => {
    for (const status of ['live', 'scheduled']) {
      vi.clearAllMocks()
      const res = await run(status)
      expect(res.statusCode).toBe(201)
      expect(db.create).toHaveBeenCalledWith(
        'meeting_participants',
        expect.objectContaining({ user_id: 'me' }),
      )
    }
  })
})
