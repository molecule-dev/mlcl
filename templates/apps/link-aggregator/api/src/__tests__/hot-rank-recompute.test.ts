import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The default "hot" feed sorts by links.rank_score, but the vote handler only updated `points` and
// never recomputed rank_score (the recomputeRank helper existed but had zero callers) — so upvotes
// never reordered the feed. Casting a vote must now recompute the link's rank_score.

const db = {
  findById: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/votes.js'

function upvoteHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/link/:linkId/up' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /link/:linkId/up not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { locals: { session: { userId: 'u1' } }, statusCode: 200, body: undefined as unknown }
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
const linkUpdates = () => db.updateById.mock.calls.filter((c) => c[0] === 'links')

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockImplementation((table: string) =>
    Promise.resolve(
      table === 'links'
        ? { id: 'L1', points: 5, submitter_id: 'other', created_at: '2026-01-01T00:00:00.000Z' }
        : { id: 'other', karma: 10 },
    ),
  )
  db.findMany.mockResolvedValue([]) // no existing vote
  db.create.mockResolvedValue({ data: {} })
  db.updateById.mockResolvedValue({ data: {} })
})

describe('casting a vote recomputes the hot-feed rank', () => {
  it('writes both points and a recomputed rank_score to the link', async () => {
    await upvoteHandler()({ params: { linkId: 'L1' } } as unknown as Request, makeRes())
    const updates = linkUpdates()
    // points bump
    expect(updates.some((c) => (c[2] as { points?: number }).points === 6)).toBe(true)
    // rank recompute (recomputeRank writes a numeric rank_score)
    const rankCall = updates.find(
      (c) => typeof (c[2] as { rank_score?: number }).rank_score === 'number',
    )
    expect(rankCall).toBeDefined()
    expect((rankCall?.[2] as { rank_score: number }).rank_score).toBeGreaterThan(0)
  })
})
