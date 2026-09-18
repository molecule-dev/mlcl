import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Regression: PUT /:id (mark read) must verify ownership before mutating and
// must never return another user's notification row (IDOR — finding L2-1).

let currentUserId: string | null = 'owner-1'

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUserId,
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
}))

const db = {
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  updateMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...args: unknown[]) => db.create(...args),
  deleteById: (...args: unknown[]) => db.deleteById(...args),
  findById: (...args: unknown[]) => db.findById(...args),
  findMany: (...args: unknown[]) => db.findMany(...args),
  updateById: (...args: unknown[]) => db.updateById(...args),
  updateMany: (...args: unknown[]) => db.updateMany(...args),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('../handlers/_seed.js', () => ({
  seedDemoForUser: vi.fn().mockResolvedValue(undefined),
}))

interface MockRes {
  statusCode: number
  body: unknown
  ended: boolean
  locals: Record<string, unknown>
  status: (code: number) => MockRes
  json: (payload: unknown) => MockRes
  end: () => MockRes
}

function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: undefined,
    ended: false,
    locals: {},
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
  params: Record<string, string>,
  reqBody: Record<string, unknown>,
): Promise<MockRes> {
  const res = makeRes()
  await new Promise<void>((resolve, reject) => {
    const req = { method, url, body: reqBody, query: {}, params } as unknown as Request
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

describe('notifications mark-read — cross-tenant ownership (L2-1)', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void

  beforeEach(async () => {
    vi.resetAllMocks()
    currentUserId = 'owner-1'
    const mod = await import('../handlers/notifications.js')
    router = mod.default as unknown as typeof router
  })

  it('does not mark-read or leak another user notification — 404, no write', async () => {
    db.findById.mockResolvedValue({ id: 'victim-notif', user_id: 'someone-else', title: 'secret' })
    const res = await dispatch(
      router,
      'PUT',
      '/victim-notif',
      { id: 'victim-notif' },
      {
        read: true,
      },
    )
    expect(res.statusCode).toBe(404)
    expect(db.updateById).not.toHaveBeenCalled()
    expect(res.body).not.toMatchObject({ title: 'secret' })
  })

  it('marks the caller-owned notification read (200)', async () => {
    db.findById.mockResolvedValue({ id: 'mine', user_id: 'owner-1' })
    db.updateById.mockResolvedValue({ data: { id: 'mine', user_id: 'owner-1', read: true } })
    const res = await dispatch(router, 'PUT', '/mine', { id: 'mine' }, { read: true })
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledTimes(1)
    expect((db.updateById.mock.calls[0] as unknown[])[1]).toBe('mine')
  })

  it('rejects an unauthenticated mark-read with 401 before any write', async () => {
    currentUserId = null
    const res = await dispatch(router, 'PUT', '/mine', { id: 'mine' }, { read: true })
    expect(res.statusCode).toBe(401)
    expect(db.updateById).not.toHaveBeenCalled()
  })
})
