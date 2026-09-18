import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// quizzes.play_count is shown across the app ("{{count}} plays") but was only ever written as 0 —
// nothing incremented it, so every real quiz sat at 0. Starting a game session now counts a play
// on the quiz, guarded so re-starting an already-active session cannot inflate it.

const db = {
  findById: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'host-1',
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn(), sendTo: vi.fn() }))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/sessions.js'

function startHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/start' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/start not found')
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
const quizUpdate = () =>
  db.updateById.mock.calls.find((c) => c[0] === 'quizzes') as
    [string, string, Record<string, unknown>] | undefined
const run = (status: string) => {
  db.findById.mockImplementation((table: unknown) =>
    Promise.resolve(
      table === 'quiz_sessions'
        ? { id: 'sess-1', status, host_id: 'host-1', quiz_id: 'q1' }
        : table === 'quizzes'
          ? { id: 'q1', play_count: 5 }
          : null,
    ),
  )
  db.updateById.mockResolvedValue({ data: { id: 'sess-1', status: 'active' } })
  const res = makeRes()
  return startHandler()(
    { params: { id: 'sess-1' } } as unknown as Request,
    res as unknown as Response,
  ).then(() => res)
}

beforeEach(() => vi.clearAllMocks())

describe('starting a game counts a play on the quiz', () => {
  it('increments the quiz play_count when a waiting session starts', async () => {
    const res = await run('waiting')
    expect(res.statusCode).toBe(200)
    expect(quizUpdate()?.[1]).toBe('q1')
    expect(quizUpdate()?.[2]).toEqual({ play_count: 6 })
  })

  it('does not re-count when an already-active session is started again', async () => {
    await run('active')
    expect(quizUpdate()).toBeUndefined()
  })
})
