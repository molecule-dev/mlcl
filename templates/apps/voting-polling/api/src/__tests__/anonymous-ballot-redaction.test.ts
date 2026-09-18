import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// polls.allow_anonymous is a secret-ballot flag ("Voter names hidden in the audit
// log; tallies remain authenticated") that no read path consumed — the ballot
// stream (GET /votes/poll/:pollId) returned raw rows exposing user_id + voter_id
// even for an anonymous poll. It now redacts voter identity when allow_anonymous
// (the stored user_id still drives the one-vote guard server-side).

const db = { count: vi.fn(), create: vi.fn(), findById: vi.fn(), findMany: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'owner-1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn().mockResolvedValue(undefined) }))

import router from '../handlers/votes.js'

function pollVotesHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/poll/:pollId' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET /poll/:pollId not found')
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
    json(b: unknown) {
      res.body = b
      return res
    },
  }) as unknown as Response & { statusCode: number; body: unknown }
}
type VoteRow = { id: string; user_id: unknown; voter_id: unknown; option_index: number }
const run = (allowAnonymous: boolean): Promise<VoteRow[]> => {
  db.findById.mockResolvedValue({ id: 'p1', user_id: 'owner-1', allow_anonymous: allowAnonymous })
  db.findMany.mockResolvedValue([
    { id: 'v1', poll_id: 'p1', user_id: 'voter-a', voter_id: 'voter-a', option_index: 0 },
    { id: 'v2', poll_id: 'p1', user_id: 'voter-b', voter_id: 'voter-b', option_index: 1 },
  ])
  const res = makeRes()
  return pollVotesHandler()(
    { params: { pollId: 'p1' }, query: { page: 1, limit: 50 } } as unknown as Request,
    res,
  ).then(() => res.body as VoteRow[])
}

beforeEach(() => vi.clearAllMocks())

describe('GET /votes/poll/:pollId honors allow_anonymous', () => {
  it('redacts user_id + voter_id on an anonymous poll (identity hidden)', async () => {
    const body = await run(true)
    expect(body).toHaveLength(2)
    for (const v of body) {
      expect(v.user_id).toBeNull()
      expect(v.voter_id).toBeNull()
    }
    // the ballot content itself is preserved — only identity is hidden
    expect(body.map((v) => v.option_index)).toEqual([0, 1])
  })

  it('keeps voter identity on a non-anonymous poll', async () => {
    const body = await run(false)
    expect(body[0].user_id).toBe('voter-a')
    expect(body[0].voter_id).toBe('voter-a')
  })
})
