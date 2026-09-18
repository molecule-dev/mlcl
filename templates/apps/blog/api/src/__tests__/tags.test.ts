import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mocks for all @molecule/* deps the tags handler imports --------------

let currentUserId: string | null = 'caller'
const paramId = 'tag-1'

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

async function dispatch(
  router: (req: Request, res: Response, next: (err?: unknown) => void) => void,
  method: string,
  url: string,
  reqBody: Record<string, unknown>,
): Promise<MockRes> {
  const res = makeRes()
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

describe('tags taxonomy authorization', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void

  beforeEach(async () => {
    vi.resetAllMocks()
    currentUserId = 'caller'
    const mod = await import('../handlers/tags.js')
    router = mod.default as unknown as typeof router
  })

  // The /tags page is a self-service tag manager: any authenticated author may
  // create, rename, recolor, and delete tags. Writes require authentication
  // only — they are NOT gated behind a moderator/admin role. Only signed-out
  // requests are rejected.

  it('allows a plain authenticated user to create a tag', async () => {
    db.findById.mockResolvedValue({ id: 'caller', role: 'user' })
    db.create.mockResolvedValue({ data: { id: paramId, name: 'react', slug: 'react' } })
    const res = await dispatch(router, 'POST', '/', { name: 'react' })
    expect(res.statusCode).toBe(201)
    expect(db.create).toHaveBeenCalledTimes(1)
  })

  it('allows a plain authenticated user to update a tag', async () => {
    db.findById.mockResolvedValue({ id: paramId, name: 'react', slug: 'react' })
    db.updateById.mockResolvedValue({ data: { id: paramId, name: 'reactjs', slug: 'reactjs' } })
    const res = await dispatch(router, 'PATCH', `/${paramId}`, { name: 'reactjs' })
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledTimes(1)
  })

  it('allows a plain authenticated user to delete a tag', async () => {
    db.findById.mockResolvedValue({ id: paramId, name: 'react', slug: 'react' })
    db.deleteById.mockResolvedValue(undefined)
    const res = await dispatch(router, 'DELETE', `/${paramId}`, {})
    expect(res.statusCode).toBe(204)
    expect(db.deleteById).toHaveBeenCalledTimes(1)
  })

  it('rejects unauthenticated create with 401', async () => {
    currentUserId = null
    const res = await dispatch(router, 'POST', '/', { name: 'hacked' })
    expect(res.statusCode).toBe(401)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated update with 401', async () => {
    currentUserId = null
    const res = await dispatch(router, 'PATCH', `/${paramId}`, { name: 'hacked' })
    expect(res.statusCode).toBe(401)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated delete with 401', async () => {
    currentUserId = null
    const res = await dispatch(router, 'DELETE', `/${paramId}`, {})
    expect(res.statusCode).toBe(401)
    expect(db.deleteById).not.toHaveBeenCalled()
  })

  it('returns 404 when updating a tag that does not exist', async () => {
    db.findById.mockResolvedValue(null)
    const res = await dispatch(router, 'PATCH', `/${paramId}`, { name: 'ghost' })
    expect(res.statusCode).toBe(404)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('returns 404 when deleting a tag that does not exist', async () => {
    db.findById.mockResolvedValue(null)
    const res = await dispatch(router, 'DELETE', `/${paramId}`, {})
    expect(res.statusCode).toBe(404)
    expect(db.deleteById).not.toHaveBeenCalled()
  })
})
