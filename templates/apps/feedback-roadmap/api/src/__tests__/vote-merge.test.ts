import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Voting is a strict toggle: one upvote per (post, user), repeat POST removes
// it. Merging a duplicate moves its votes onto the survivor — a voter who
// already voted the target keeps a single vote (UNIQUE pair), so the merged
// count is the UNION of voters, never the sum.

const db = {
  count: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  count: (...a: unknown[]) => db.count(...a),
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, v?: unknown, o?: { defaultValue?: string }) => {
    const tpl = o?.defaultValue ?? _k
    if (tpl && typeof tpl === 'string' && v && typeof v === 'object') {
      return Object.entries(v as Record<string, unknown>).reduce(
        (acc, [key, val]) => acc.replaceAll(`{{${key}}}`, String(val)),
        tpl,
      )
    }
    return tpl
  },
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))
vi.mock('@molecule/api-search', () => ({ index: vi.fn(), search: vi.fn() }))

import adminRouter from '../handlers/admin.js'
import votesRouter from '../handlers/votes.js'

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
}

function handlerFor(
  r: { stack: RouteLayer[] } | { stack: unknown[] },
  path: string,
  method: 'get' | 'post',
): (req: Request, res: Response) => Promise<void> {
  const layer = (r.stack as RouteLayer[]).find(
    (l) => l.route?.path === path && l.route.methods[method],
  )
  if (!layer?.route) throw new Error(`${method.toUpperCase()} ${path} not found`)
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}

const makeRes = (locals: Record<string, unknown> = {}) =>
  ({
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals,
  }) as unknown as Response

const vote = (postId: string, userId?: string): { req: Request; res: Response } => ({
  req: { body: { post_id: postId } } as unknown as Request,
  res: makeRes(userId ? { session: { userId } } : {}),
})

const POST_ID = '11111111-1111-4111-8111-111111111111'
const TARGET_ID = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('vote toggle', () => {
  it('creates a vote when none exists', async () => {
    db.findById.mockResolvedValue({ id: POST_ID, vote_count: 3 })
    // findMany answers BOTH queries the handler makes: the pair lookup
    // (two where conditions) finds nothing, then the recount (one where
    // condition) sees the freshly created row.
    db.findMany.mockImplementation(async (_table: string, opts: { where?: unknown[] }) => {
      const pairLookup = (opts?.where?.length ?? 0) > 1
      return pairLookup ? [] : [{ id: 'vote-new' }]
    })
    const { req, res } = vote(POST_ID, 'user-1')
    await handlerFor(votesRouter, '/', 'post')(req, res)
    expect(db.create).toHaveBeenCalledWith(
      'feedback_votes',
      expect.objectContaining({
        post_id: POST_ID,
        user_id: 'user-1',
      }),
    )
    expect(res.json).toHaveBeenCalledWith({ voted: true, vote_count: 1 })
  })

  it('removes the vote on repeat (toggle off)', async () => {
    db.findById.mockResolvedValue({ id: POST_ID, vote_count: 3 })
    db.findMany.mockImplementation(async (_table: string, opts: { where?: unknown[] }) => {
      const pairLookup = (opts?.where?.length ?? 0) > 1
      return pairLookup ? [{ id: 'vote-row-1', post_id: POST_ID, user_id: 'user-1' }] : [] // recount after the delete sees nothing
    })
    const { req, res } = vote(POST_ID, 'user-1')
    await handlerFor(votesRouter, '/', 'post')(req, res)
    expect(db.deleteById).toHaveBeenCalledWith('feedback_votes', 'vote-row-1')
    expect(db.create).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ voted: false, vote_count: 0 })
  })

  it('requires a session (401 anonymous)', async () => {
    const { req, res } = vote(POST_ID)
    await handlerFor(votesRouter, '/', 'post')(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('404s when the post does not exist', async () => {
    db.findById.mockResolvedValue(null)
    const { req, res } = vote(POST_ID, 'user-1')
    await handlerFor(votesRouter, '/', 'post')(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('admin merge', () => {
  const ADMIN = { id: 'admin-1', role: 'admin' }
  const MEMBER = { id: 'member-1', role: 'member' }

  const mergeReq = (session?: { userId: string }): { req: Request; res: Response } => ({
    req: { params: { id: POST_ID }, body: { target_id: TARGET_ID } } as unknown as Request,
    res: makeRes(session ? { session } : {}),
  })

  it('moves votes (union, not sum) and comments, stamps the source', async () => {
    db.findById.mockImplementation(async (_table: string, id: string) => {
      if (id === ADMIN.id) return ADMIN
      if (id === POST_ID)
        return { id: POST_ID, title: 'Duplicate', vote_count: 2, comment_count: 1 }
      if (id === TARGET_ID)
        return { id: TARGET_ID, title: 'Survivor', vote_count: 3, comment_count: 2 }
      return null
    })
    // source voters: u1 (also voted target) + u2 (new to target)
    db.findMany.mockImplementation(
      async (_table: string, opts: { where?: Array<{ field: string; value?: unknown }> }) => {
        const table = _table as string
        const want = opts?.where?.[0]?.value
        if (table === 'feedback_votes' && want === POST_ID)
          return [
            { id: 'sv1', post_id: POST_ID, user_id: 'u1' },
            { id: 'sv2', post_id: POST_ID, user_id: 'u2' },
          ]
        if (table === 'feedback_votes' && want === TARGET_ID)
          return [
            { id: 'tv1', post_id: TARGET_ID, user_id: 'u1' },
            { id: 'tv2', post_id: TARGET_ID, user_id: 'u3' },
          ]
        if (table === 'feedback_comments') return [{ id: 'sc1', post_id: POST_ID }]
        return []
      },
    )
    const { req, res } = mergeReq({ userId: ADMIN.id })
    await handlerFor(adminRouter, '/posts/:id/merge', 'post')(req, res)

    // u2's vote moved; u1's did NOT (already on target — union semantics)
    expect(db.create).toHaveBeenCalledTimes(1)
    expect(db.create).toHaveBeenCalledWith(
      'feedback_votes',
      expect.objectContaining({ post_id: TARGET_ID, user_id: 'u2' }),
    )
    // every source vote row was removed
    expect(db.deleteById).toHaveBeenCalledTimes(2)
    // the comment was repointed
    expect(db.updateById).toHaveBeenCalledWith('feedback_comments', 'sc1', expect.anything())
    // the source is stamped with the moved note + zeroed counters
    const stamped = db.updateById.mock.calls.find(
      (c) => c[0] === 'feedback_posts' && c[1] === POST_ID,
    )
    expect(stamped).toBeDefined()
    const updates = stamped?.[2] as Record<string, unknown>
    expect(updates.merged_into_id).toBe(TARGET_ID)
    expect(updates.admin_response).toBe('Merged into "Survivor"')
    expect(updates.vote_count).toBe(0)
    // target counters: 3 voters union u2 = 3, comments 2 + 1
    const targetCall = db.updateById.mock.calls.find(
      (c) => c[0] === 'feedback_posts' && c[1] === TARGET_ID,
    )
    expect(targetCall?.[2]).toMatchObject({ vote_count: 3, comment_count: 3 })
  })

  it('rejects a non-admin with 403', async () => {
    db.findById.mockImplementation(async (_table: string, id: string) => {
      if (id === MEMBER.id) return MEMBER
      return null
    })
    const { req, res } = mergeReq({ userId: MEMBER.id })
    await handlerFor(adminRouter, '/posts/:id/merge', 'post')(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('rejects merging a post into itself', async () => {
    db.findById.mockResolvedValue(ADMIN)
    const req = {
      params: { id: POST_ID },
      body: { target_id: POST_ID },
    } as unknown as Request
    const res = makeRes({ session: { userId: ADMIN.id } })
    await handlerFor(adminRouter, '/posts/:id/merge', 'post')(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
