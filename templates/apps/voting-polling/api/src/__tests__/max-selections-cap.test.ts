import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A multiple-choice poll's "max selections per voter" (max_votes_per_user) was enforced only on the
// client — the server validated non-empty + in-range indices but never the count, so a direct API
// call could select more options than allowed. The server must reject an over-cap ballot.

const db = { count: vi.fn(), create: vi.fn(), findById: vi.fn(), findMany: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
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

function voteHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { statusCode: 200 }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json() {
      return res
    },
  }) as unknown as Response
}
const voteCreated = () => db.create.mock.calls.some((c) => c[0] === 'votes')
const run = (optionIndex: number[], maxVotes: number) => {
  db.findById.mockResolvedValue({
    id: 'p1',
    status: 'active',
    type: 'multiple-choice',
    options: ['a', 'b', 'c', 'd'],
    max_votes_per_user: maxVotes,
    start_date: null,
    end_date: null,
  })
  const res = makeRes()
  return voteHandler()(
    { body: { poll_id: 'p1', option_index: optionIndex } } as unknown as Request,
    res,
  ).then(() => res as unknown as { statusCode: number })
}

beforeEach(() => {
  vi.clearAllMocks()
  db.count.mockResolvedValue(0) // no prior vote
  db.create.mockResolvedValue({ data: { id: 'v1' } })
  db.findMany.mockResolvedValue([])
})

describe('multiple-choice max selections cap (server-side)', () => {
  it('rejects a ballot with more selections than the cap (400, no vote)', async () => {
    const res = await run([0, 1, 2], 2)
    expect(res.statusCode).toBe(400)
    expect(voteCreated()).toBe(false)
  })

  it('allows a ballot at the cap', async () => {
    await run([0, 1], 2)
    expect(voteCreated()).toBe(true)
  })

  it('allows a ballot under the cap', async () => {
    await run([0], 2)
    expect(voteCreated()).toBe(true)
  })
})
