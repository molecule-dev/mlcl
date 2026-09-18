import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Upvoting an audience question changes the live tally, so it must broadcast to the poll channel
// like ask/status do — otherwise only the voter (in their own HTTP response) sees the new count
// and popular questions never rise in real time for other viewers.

const db = {
  findById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  query: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  query: (...a: unknown[]) => db.query(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
const broadcast = vi.fn()
vi.mock('@molecule/api-realtime', () => ({ broadcast: (...a: unknown[]) => broadcast(...a) }))

import router from '../handlers/audience_questions.js'

function voteHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/vote' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/vote not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue({ id: 'q1', poll_id: 'p1' })
  db.create.mockResolvedValue({ data: { id: 'v1' } })
  db.query.mockResolvedValue({ rows: [{ total: '3' }] })
  broadcast.mockResolvedValue(undefined)
})

describe('audience question upvote broadcast', () => {
  it('broadcasts the new tally to the poll channel', async () => {
    await voteHandler()({ params: { id: 'q1' } } as unknown as Request, makeRes())
    expect(broadcast).toHaveBeenCalledWith('poll:p1', 'question:voted', {
      questionId: 'q1',
      voteCount: 3,
    })
  })

  it('still returns the count to the caller', async () => {
    const res = makeRes()
    await voteHandler()({ params: { id: 'q1' } } as unknown as Request, res)
    expect(res.json).toHaveBeenCalledWith({ question_id: 'q1', vote_count: 3 })
  })
})
