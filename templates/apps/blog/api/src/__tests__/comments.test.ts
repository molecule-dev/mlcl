import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mocks for all @molecule/* deps the comments handler imports ----------

let currentUserId: string | null = 'caller'
const paramId = 'comment-1'

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUserId,
  getParamId: () => paramId,
}))

const db = {
  findById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => db.findById(...args),
  updateById: (...args: unknown[]) => db.updateById(...args),
  deleteById: (...args: unknown[]) => db.deleteById(...args),
  create: (...args: unknown[]) => db.create(...args),
  findMany: (...args: unknown[]) => db.findMany(...args),
  count: (...args: unknown[]) => db.count(...args),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// validateBody/validateQuery → pass-through middleware
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

// --- Test helpers ---------------------------------------------------------

interface MockRes {
  statusCode: number
  body: unknown
  ended: boolean
  status: (code: number) => MockRes
  json: (payload: unknown) => MockRes
  end: () => MockRes
}

function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: undefined,
    ended: false,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
    end() {
      this.ended = true
      return this
    },
  }
  return res
}

// Drive a request through the express Router used as standalone middleware.
async function dispatch(
  router: (req: Request, res: Response, next: (err?: unknown) => void) => void,
  method: string,
  url: string,
  reqBody: Record<string, unknown>,
  query: Record<string, unknown> = {},
): Promise<MockRes> {
  const res = makeRes()
  await new Promise<void>((resolve, reject) => {
    const req = { method, url, body: reqBody, query, params: {} } as unknown as Request
    router(req, res as unknown as Response, (err?: unknown) => {
      if (err) reject(err)
      else resolve()
    })
    // Resolve once the handler has responded (handlers are async; poll briefly).
    const start = Date.now()
    const check = (): void => {
      if (res.ended || res.body !== undefined) resolve()
      else if (Date.now() - start > 2000) reject(new Error('handler timeout'))
      else setTimeout(check, 5)
    }
    check()
  })
  return res
}

describe('comments moderation authorization', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void

  beforeEach(async () => {
    vi.resetAllMocks()
    currentUserId = 'caller'
    const mod = await import('../handlers/comments.js')
    router = mod.default as unknown as typeof router
  })

  describe('PATCH /:id', () => {
    it("rejects editing another user's comment with 403", async () => {
      // existing comment owned by someone else; caller is a plain user.
      db.findById.mockImplementation((table: string) =>
        table === 'comments'
          ? Promise.resolve({ id: paramId, userId: 'other-user', body: 'hi' })
          : Promise.resolve({ id: 'caller', role: 'user' }),
      )
      const res = await dispatch(router, 'PATCH', `/${paramId}`, { body: 'defaced' })
      expect(res.statusCode).toBe(403)
      expect(db.updateById).not.toHaveBeenCalled()
    })

    it('rejects status (moderation) flip by a non-moderator owner with 403', async () => {
      db.findById.mockImplementation((table: string) =>
        table === 'comments'
          ? Promise.resolve({ id: paramId, userId: 'caller', body: 'hi' })
          : Promise.resolve({ id: 'caller', role: 'user' }),
      )
      const res = await dispatch(router, 'PATCH', `/${paramId}`, { status: 'spam' })
      expect(res.statusCode).toBe(403)
      expect(db.updateById).not.toHaveBeenCalled()
    })

    it('allows an author to edit their own comment body', async () => {
      db.findById.mockImplementation((table: string) =>
        table === 'comments'
          ? Promise.resolve({ id: paramId, userId: 'caller', body: 'hi' })
          : Promise.resolve({ id: 'caller', role: 'user' }),
      )
      db.updateById.mockResolvedValue({ data: { id: paramId, body: 'edited' } })
      const res = await dispatch(router, 'PATCH', `/${paramId}`, { body: 'edited' })
      expect(res.statusCode).toBe(200)
      expect(db.updateById).toHaveBeenCalledTimes(1)
    })

    it('allows a moderator to moderate (status flip) any comment', async () => {
      db.findById.mockImplementation((table: string) =>
        table === 'comments'
          ? Promise.resolve({ id: paramId, userId: 'other-user', body: 'hi' })
          : Promise.resolve({ id: 'caller', role: 'moderator' }),
      )
      db.updateById.mockResolvedValue({ data: { id: paramId, status: 'spam' } })
      const res = await dispatch(router, 'PATCH', `/${paramId}`, { status: 'spam' })
      expect(res.statusCode).toBe(200)
      expect(db.updateById).toHaveBeenCalledTimes(1)
    })

    it('allows the post author to moderate (status flip) a comment on their own post', async () => {
      // caller is a plain user, but they authored the post the comment is on,
      // so they may moderate comments on their own posts.
      db.findById.mockImplementation((table: string) => {
        if (table === 'comments')
          return Promise.resolve({
            id: paramId,
            userId: 'other-user',
            body: 'hi',
            resourceType: 'post',
            resourceId: 'post-1',
          })
        if (table === 'posts') return Promise.resolve({ id: 'post-1', author_id: 'caller' })
        return Promise.resolve({ id: 'caller', role: 'user' })
      })
      db.updateById.mockResolvedValue({ data: { id: paramId, status: 'spam' } })
      const res = await dispatch(router, 'PATCH', `/${paramId}`, { status: 'spam' })
      expect(res.statusCode).toBe(200)
      expect(db.updateById).toHaveBeenCalledTimes(1)
    })
  })

  describe('GET / (list scoping)', () => {
    it('scopes a non-moderator to their OWN comments even when ?status=all is supplied', async () => {
      db.findById.mockResolvedValue({ id: 'caller', role: 'user' })
      db.findMany.mockResolvedValue([])
      db.count.mockResolvedValue(0)
      const res = await dispatch(router, 'GET', '/', {}, { status: 'all' })
      expect(res.statusCode).toBe(200)
      const where = db.findMany.mock.calls[0][1].where as Array<{ field: string; value: string }>
      // Own-comments scope — prevents enumerating other users' rows.
      expect(where.find((c) => c.field === 'userId')).toEqual({
        field: 'userId',
        operator: '=',
        value: 'caller',
      })
      // status=all → no status filter is added on top of the own-comments scope.
      expect(where.find((c) => c.field === 'status')).toBeUndefined()
    })

    it('still scopes a non-moderator to their OWN comments and honors ?status=pending', async () => {
      db.findById.mockResolvedValue({ id: 'caller', role: 'user' })
      db.findMany.mockResolvedValue([])
      db.count.mockResolvedValue(0)
      const res = await dispatch(router, 'GET', '/', {}, { status: 'pending' })
      expect(res.statusCode).toBe(200)
      const where = db.findMany.mock.calls[0][1].where as Array<{ field: string; value: string }>
      expect(where.find((c) => c.field === 'userId')).toEqual({
        field: 'userId',
        operator: '=',
        value: 'caller',
      })
      expect(where.find((c) => c.field === 'status')).toEqual({
        field: 'status',
        operator: '=',
        value: 'pending',
      })
    })

    it('gives the post author the full moderation list for their own post', async () => {
      // Plain user, but they authored post-1 → full moderation queue for it
      // (no own-comments scope; client status filter honored).
      db.findById.mockImplementation((table: string) => {
        if (table === 'posts') return Promise.resolve({ id: 'post-1', author_id: 'caller' })
        return Promise.resolve({ id: 'caller', role: 'user' })
      })
      db.findMany.mockResolvedValue([])
      db.count.mockResolvedValue(0)
      const res = await dispatch(
        router,
        'GET',
        '/',
        {},
        { status: 'pending', resourceType: 'post', resourceId: 'post-1' },
      )
      expect(res.statusCode).toBe(200)
      const where = db.findMany.mock.calls[0][1].where as Array<{ field: string; value: string }>
      // No own-comments scope for the post author.
      expect(where.find((c) => c.field === 'userId')).toBeUndefined()
      expect(where.find((c) => c.field === 'status')).toEqual({
        field: 'status',
        operator: '=',
        value: 'pending',
      })
    })

    it('lets a site-wide moderator request pending comments', async () => {
      db.findById.mockResolvedValue({ id: 'caller', role: 'moderator' })
      db.findMany.mockResolvedValue([])
      db.count.mockResolvedValue(0)
      const res = await dispatch(router, 'GET', '/', {}, { status: 'pending' })
      expect(res.statusCode).toBe(200)
      const where = db.findMany.mock.calls[0][1].where as Array<{ field: string; value: string }>
      expect(where.find((c) => c.field === 'userId')).toBeUndefined()
      expect(where.find((c) => c.field === 'status')).toEqual({
        field: 'status',
        operator: '=',
        value: 'pending',
      })
    })
  })

  describe('DELETE /:id', () => {
    it("rejects deleting another user's comment with 403", async () => {
      db.findById.mockImplementation((table: string) =>
        table === 'comments'
          ? Promise.resolve({ id: paramId, userId: 'other-user', body: 'hi' })
          : Promise.resolve({ id: 'caller', role: 'user' }),
      )
      const res = await dispatch(router, 'DELETE', `/${paramId}`, {})
      expect(res.statusCode).toBe(403)
      expect(db.deleteById).not.toHaveBeenCalled()
    })

    it('allows an author to delete their own comment', async () => {
      db.findById.mockImplementation((table: string) =>
        table === 'comments'
          ? Promise.resolve({ id: paramId, userId: 'caller', body: 'hi' })
          : Promise.resolve({ id: 'caller', role: 'user' }),
      )
      db.deleteById.mockResolvedValue(undefined)
      const res = await dispatch(router, 'DELETE', `/${paramId}`, {})
      expect(res.statusCode).toBe(204)
      expect(db.deleteById).toHaveBeenCalledTimes(1)
    })

    it('allows an admin to delete any comment', async () => {
      db.findById.mockImplementation((table: string) =>
        table === 'comments'
          ? Promise.resolve({ id: paramId, userId: 'other-user', body: 'hi' })
          : Promise.resolve({ id: 'caller', role: 'admin' }),
      )
      db.deleteById.mockResolvedValue(undefined)
      const res = await dispatch(router, 'DELETE', `/${paramId}`, {})
      expect(res.statusCode).toBe(204)
      expect(db.deleteById).toHaveBeenCalledTimes(1)
    })
  })
})
