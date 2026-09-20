import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The admin status workflow is the app's signature flow: a post moves
// open → planned → in_progress → shipped (stamping shipped_at, which is what
// makes it a changelog entry), or is declined (clearing any roadmap label).
// Leaving shipped must clear shipped_at so a reopened feature does not linger
// in the changelog with a stale date.

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

import router from '../handlers/admin.js'

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
}

function handlerFor(
  path: string,
  method: 'get' | 'post',
): (req: Request, res: Response) => Promise<void> {
  const layer = (router.stack as RouteLayer[]).find(
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

const ADMIN_USER = { id: 'admin-1', role: 'admin' }
const MEMBER_USER = { id: 'member-1', role: 'member' }

/** db.findById answers users by id and posts by uuid-ish ids in turn. */
function primeIds(users: unknown[], ...posts: unknown[]) {
  let postIdx = 0
  db.findById.mockImplementation(async (_table: string, id: string) => {
    const user = users.find((u) => (u as { id: string }).id === id)
    if (user) return user
    return posts[postIdx++ % Math.max(posts.length, 1)] ?? null
  })
}

const POST_ID = '11111111-1111-4111-8111-111111111111'

function callStatus(
  session: { userId: string } | undefined,
  status: string,
  extra: Record<string, unknown> = {},
): { req: Request; res: Response } {
  return {
    req: { params: { id: POST_ID }, body: { status, ...extra } } as unknown as Request,
    res: makeRes(session ? { session } : {}),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('admin status workflow', () => {
  it('marks planned with an official response and roadmap label', async () => {
    primeIds([ADMIN_USER], { id: POST_ID, status: 'open' })
    const { req, res } = callStatus({ userId: ADMIN_USER.id }, 'planned', {
      admin_response: 'Slotted for the analytics revamp.',
      roadmap_label: 'Q1 2027',
    })
    await handlerFor('/posts/:id/status', 'post')(req, res)
    expect(res.status).not.toHaveBeenCalledWith(401)
    expect(res.status).not.toHaveBeenCalledWith(403)
    const [table, id, updates] = db.updateById.mock.calls[0] as unknown as [
      string,
      string,
      Record<string, unknown>,
    ]
    expect(table).toBe('feedback_posts')
    expect(id).toBe(POST_ID)
    expect(updates.status).toBe('planned')
    expect(updates.admin_response).toBe('Slotted for the analytics revamp.')
    expect(updates.roadmap_label).toBe('Q1 2027')
    expect(updates.shipped_at).toBeNull()
  })

  it('stamps shipped_at when shipping (the changelog trigger)', async () => {
    primeIds([ADMIN_USER], { id: POST_ID, status: 'in_progress', shipped_at: null })
    const { req, res } = callStatus({ userId: ADMIN_USER.id }, 'shipped')
    await handlerFor('/posts/:id/status', 'post')(req, res)
    const updates = db.updateById.mock.calls[0][2] as Record<string, unknown>
    expect(updates.status).toBe('shipped')
    expect(typeof updates.shipped_at).toBe('string')
  })

  it('keeps the original ship date when re-affirming shipped', async () => {
    const original = '2026-08-01T00:00:00.000Z'
    primeIds([ADMIN_USER], { id: POST_ID, status: 'shipped', shipped_at: original })
    const { req, res } = callStatus({ userId: ADMIN_USER.id }, 'shipped')
    await handlerFor('/posts/:id/status', 'post')(req, res)
    const updates = db.updateById.mock.calls[0][2] as Record<string, unknown>
    expect(updates.shipped_at).toBe(original)
  })

  it('clears shipped_at and roadmap label when reopening', async () => {
    primeIds([ADMIN_USER], {
      id: POST_ID,
      status: 'shipped',
      shipped_at: '2026-08-01T00:00:00.000Z',
    })
    const { req, res } = callStatus({ userId: ADMIN_USER.id }, 'open')
    await handlerFor('/posts/:id/status', 'post')(req, res)
    const updates = db.updateById.mock.calls[0][2] as Record<string, unknown>
    expect(updates.shipped_at).toBeNull()
    expect(updates.roadmap_label).toBeNull()
  })

  it('rejects a member with 403', async () => {
    primeIds([MEMBER_USER], { id: POST_ID, status: 'open' })
    const { req, res } = callStatus({ userId: MEMBER_USER.id }, 'planned')
    await handlerFor('/posts/:id/status', 'post')(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('rejects an anonymous caller with 401', async () => {
    primeIds([])
    const { req, res } = callStatus(undefined, 'planned')
    await handlerFor('/posts/:id/status', 'post')(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('refuses status changes on a merged duplicate', async () => {
    primeIds([ADMIN_USER], {
      id: POST_ID,
      status: 'open',
      merged_into_id: '22222222-2222-4222-8222-222222222222',
    })
    const { req, res } = callStatus({ userId: ADMIN_USER.id }, 'planned')
    await handlerFor('/posts/:id/status', 'post')(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
