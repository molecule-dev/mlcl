import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Only a commenter/editor share may post comments — a viewer is read-only. The comment-create
// handler gated on requireReadableDocument (ANY share role passed), so a viewer could comment and
// the whole commenter tier was dead. It must reject a viewer with 403.

const authz = {
  requireUser: vi.fn((..._a: unknown[]): string | null => 'u1'),
  requireReadableDocument: vi.fn(),
  requireCommentAccess: vi.fn(),
  safeBroadcast: vi.fn(),
  validationError: vi.fn((res: Response) => res.status(400).json({ error: 'invalid' })),
  internalError: vi.fn((res: Response) => res.status(500).json({ error: 'internal' })),
}
vi.mock('../lib/authz.js', () => ({
  requireUser: (...a: unknown[]) => authz.requireUser(...a),
  requireReadableDocument: (...a: unknown[]) => authz.requireReadableDocument(...a),
  requireCommentAccess: (...a: unknown[]) => authz.requireCommentAccess(...a),
  safeBroadcast: (...a: unknown[]) => authz.safeBroadcast(...a),
  validationError: (res: Response) => authz.validationError(res),
  internalError: (res: Response) => authz.internalError(res),
}))
const db = { create: vi.fn(), deleteById: vi.fn(), findMany: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import router from '../handlers/comments.js'

const DOC = '11111111-1111-4111-8111-111111111111'
function postComment(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:documentId' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:documentId not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () =>
  ({ json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() }) as unknown as Response & {
    status: ReturnType<typeof vi.fn>
  }
const run = (role: string | null) => {
  authz.requireReadableDocument.mockResolvedValue(
    role === null ? null : { document: { id: DOC, owner_id: 'owner' }, role },
  )
  const res = makeRes()
  return postComment()(
    { params: { documentId: DOC }, body: { body: 'Nice work' } } as unknown as Request,
    res,
  ).then(() => res)
}

beforeEach(() => {
  vi.clearAllMocks()
  authz.requireUser.mockReturnValue('u1')
  db.create.mockResolvedValue({ data: { id: 'cm1' } })
})

describe('comment create enforces the commenter tier', () => {
  it('rejects a viewer with 403 and no create', async () => {
    const res = await run('viewer')
    expect(res.status).toHaveBeenCalledWith(403)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('allows a commenter to post', async () => {
    const res = await run('commenter')
    expect(db.create).toHaveBeenCalledWith(
      'document_comments',
      expect.objectContaining({ document_id: DOC }),
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('allows an editor to post', async () => {
    await run('editor')
    expect(db.create).toHaveBeenCalled()
  })

  it('404s a non-member (no share) without leaking existence', async () => {
    const res = await run(null)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(db.create).not.toHaveBeenCalled()
  })
})
