import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mocks for all @molecule/* deps the categories handler imports --------

const paramId = 'category-1'

vi.mock('@molecule/api-bonds-default-express', () => ({
  getParamId: () => paramId,
}))

const db = {
  findById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => db.findById(...args),
  updateById: (...args: unknown[]) => db.updateById(...args),
  deleteById: (...args: unknown[]) => db.deleteById(...args),
  create: (...args: unknown[]) => db.create(...args),
  findMany: (...args: unknown[]) => db.findMany(...args),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

// --- Test helpers ---------------------------------------------------------

interface MockRes {
  statusCode: number
  body: unknown
  ended: boolean
  locals: Record<string, unknown>
  status: (code: number) => MockRes
  json: (payload: unknown) => MockRes
  end: () => MockRes
}

function makeRes(session?: { userId?: string }): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: undefined,
    ended: false,
    locals: { session },
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

async function dispatch(
  router: (req: Request, res: Response, next: (err?: unknown) => void) => void,
  method: string,
  url: string,
  reqBody: Record<string, unknown>,
  session?: { userId?: string },
): Promise<MockRes> {
  const res = makeRes(session)
  await new Promise<void>((resolve, reject) => {
    const req = { method, url, body: reqBody, query: {}, params: {} } as unknown as Request
    router(req, res as unknown as Response, (err?: unknown) => {
      if (err) reject(err)
      else resolve()
    })
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

describe('categories taxonomy authorization', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void

  beforeEach(async () => {
    vi.resetAllMocks()
    const mod = await import('../handlers/categories.js')
    router = mod.default as unknown as typeof router
  })

  it('rejects create by a plain authenticated (non-moderator) user with 403', async () => {
    db.findById.mockResolvedValue({ id: 'caller', role: 'user' })
    const res = await dispatch(router, 'POST', '/', { name: 'hacked' }, { userId: 'caller' })
    expect(res.statusCode).toBe(403)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('rejects update by a plain authenticated (non-moderator) user with 403', async () => {
    db.findById.mockResolvedValue({ id: 'caller', role: 'user' })
    const res = await dispatch(
      router,
      'PUT',
      `/${paramId}`,
      { name: 'defaced' },
      { userId: 'caller' },
    )
    expect(res.statusCode).toBe(403)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('rejects delete by a plain authenticated (non-moderator) user with 403', async () => {
    db.findById.mockResolvedValue({ id: 'caller', role: 'user' })
    const res = await dispatch(router, 'DELETE', `/${paramId}`, {}, { userId: 'caller' })
    expect(res.statusCode).toBe(403)
    expect(db.deleteById).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated create with 401 (before the role check)', async () => {
    const res = await dispatch(router, 'POST', '/', { name: 'hacked' }, undefined)
    expect(res.statusCode).toBe(401)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('allows a moderator to create a category', async () => {
    db.findById.mockResolvedValue({ id: 'caller', role: 'moderator' })
    db.create.mockResolvedValue({ data: { id: paramId, name: 'News', slug: 'news' } })
    const res = await dispatch(router, 'POST', '/', { name: 'News' }, { userId: 'caller' })
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledTimes(1)
  })

  it('allows an admin to delete a category', async () => {
    db.findById.mockImplementation((table: string) =>
      table === 'categories'
        ? Promise.resolve({ id: paramId, name: 'News' })
        : Promise.resolve({ id: 'caller', role: 'admin' }),
    )
    db.deleteById.mockResolvedValue(undefined)
    const res = await dispatch(router, 'DELETE', `/${paramId}`, {}, { userId: 'caller' })
    expect(res.statusCode).toBe(204)
    expect(db.deleteById).toHaveBeenCalledTimes(1)
  })
})
