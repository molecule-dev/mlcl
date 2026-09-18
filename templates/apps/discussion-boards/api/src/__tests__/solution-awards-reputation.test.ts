import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Accepting a post as a topic's solution set is_solution + topic status='solved' but never awarded
// the answer's author any reputation — yet `users.reputation` drives the whole Newcomer→Elder badge
// system, so every member sat permanently at 0. Marking a solution now awards the author reputation
// (once — re-marking the same post must not award again).

const db = {
  count: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'author-1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/posts.js'

function solutionHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:topicId/:postId/solution' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:topicId/:postId/solution not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { statusCode: 200, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(o: unknown) {
      res.body = o
      return res
    },
  }) as unknown as Response
}
const userUpdate = () =>
  db.updateById.mock.calls.find((c) => c[0] === 'users') as
    [string, string, Record<string, unknown>] | undefined
// The caller ('author-1') is the topic author, so the moderator check short-circuits.
const run = (postIsSolution: boolean, authorRep = 100) => {
  db.findById.mockImplementation((table: unknown) => {
    if (table === 'topics') return Promise.resolve({ id: 't1', author_id: 'author-1' })
    if (table === 'posts')
      return Promise.resolve({
        id: 'p1',
        topic_id: 't1',
        author_id: 'answerer-1',
        is_solution: postIsSolution,
      })
    if (table === 'users') return Promise.resolve({ id: 'answerer-1', reputation: authorRep })
    return Promise.resolve(null)
  })
  db.updateById.mockResolvedValue({ data: { id: 'p1' } })
  const req = { params: { topicId: 't1', postId: 'p1' } } as unknown as Request
  return solutionHandler()(req, makeRes())
}

beforeEach(() => vi.clearAllMocks())

describe('marking a solution awards reputation', () => {
  it('adds the award to the answer author (100 → 115) and marks post + topic', async () => {
    await run(false, 100)
    expect(userUpdate()?.[1]).toBe('answerer-1')
    expect(userUpdate()?.[2]).toEqual({ reputation: 115 })
    expect(db.updateById.mock.calls.find((c) => c[0] === 'posts')?.[2]).toMatchObject({
      is_solution: true,
    })
    expect(db.updateById.mock.calls.find((c) => c[0] === 'topics')?.[2]).toMatchObject({
      status: 'solved',
    })
  })

  it('does not award again when the post is already the solution', async () => {
    await run(true, 100)
    expect(userUpdate()).toBeUndefined()
  })
})
