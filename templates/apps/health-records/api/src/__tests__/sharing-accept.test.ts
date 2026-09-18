import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The recipient side of record sharing: POST /accept claims a grant via its emailed
// token (24 random bytes = the credential) and binds it to the signed-in user;
// GET /received lists the grants a user has accepted. These guard the token flow:
// a bad/revoked/expired token never writes, and an already-claimed grant can't be
// hijacked by a second account.

let currentUserId: string | null = 'recipient-1'

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
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))

vi.mock('@molecule/api-emails', () => ({ hasTransport: () => false, sendMail: vi.fn() }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

interface MockRes {
  statusCode: number
  body: unknown
  ended: boolean
  locals: Record<string, unknown>
  status: (c: number) => MockRes
  json: (p: unknown) => MockRes
  end: () => MockRes
}
function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: undefined,
    ended: false,
    locals: {},
    status(c) {
      this.statusCode = c
      return this
    },
    json(p) {
      this.body = p
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
  body: Record<string, unknown>,
): Promise<MockRes> {
  const res = makeRes()
  await new Promise<void>((resolve, reject) => {
    const req = { method, url, body, query: {}, params: {} } as unknown as Request
    router(req, res as unknown as Response, (err?: unknown) => (err ? reject(err) : resolve()))
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

describe('sharing accept — token flow', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void
  beforeEach(async () => {
    vi.resetAllMocks()
    currentUserId = 'recipient-1'
    router = (await import('../handlers/sharing.js')).default as unknown as typeof router
  })

  it('claims an unclaimed grant and binds recipient_user_id (200)', async () => {
    db.findMany.mockResolvedValue([
      {
        id: 'g1',
        owner_user_id: 'owner-1',
        recipient_user_id: null,
        scope: '["labs"]',
        role: 'viewer',
      },
    ])
    db.updateById.mockResolvedValue({ data: {} })
    db.findById.mockResolvedValue({ name: 'Dr. Owner' })
    const res = await dispatch(router, 'POST', '/accept', { token: 'good' })
    expect(res.statusCode).toBe(200)
    expect(db.updateById).toHaveBeenCalledTimes(1)
    expect((db.updateById.mock.calls[0] as unknown[])[2]).toMatchObject({
      recipient_user_id: 'recipient-1',
    })
    expect(res.body).toMatchObject({ scope: ['labs'], owner_name: 'Dr. Owner' })
  })

  it('unknown token → 404, no write', async () => {
    db.findMany.mockResolvedValue([])
    const res = await dispatch(router, 'POST', '/accept', { token: 'nope' })
    expect(res.statusCode).toBe(404)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('revoked grant → 410, no write', async () => {
    db.findMany.mockResolvedValue([
      {
        id: 'g1',
        owner_user_id: 'owner-1',
        recipient_user_id: null,
        revoked_at: new Date(),
        scope: '[]',
      },
    ])
    const res = await dispatch(router, 'POST', '/accept', { token: 'revoked' })
    expect(res.statusCode).toBe(410)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('expired grant → 410, no write', async () => {
    db.findMany.mockResolvedValue([
      {
        id: 'g1',
        owner_user_id: 'owner-1',
        recipient_user_id: null,
        expires_at: '2000-01-01',
        scope: '[]',
      },
    ])
    const res = await dispatch(router, 'POST', '/accept', { token: 'expired' })
    expect(res.statusCode).toBe(410)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('grant already claimed by another account → 409, no write', async () => {
    db.findMany.mockResolvedValue([
      { id: 'g1', owner_user_id: 'owner-1', recipient_user_id: 'someone-else', scope: '[]' },
    ])
    const res = await dispatch(router, 'POST', '/accept', { token: 'taken' })
    expect(res.statusCode).toBe(409)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('idempotent when already claimed by the same user → 200, no re-write', async () => {
    db.findMany.mockResolvedValue([
      {
        id: 'g1',
        owner_user_id: 'owner-1',
        recipient_user_id: 'recipient-1',
        scope: '["labs"]',
        role: 'viewer',
      },
    ])
    db.findById.mockResolvedValue({ name: 'Dr. Owner' })
    const res = await dispatch(router, 'POST', '/accept', { token: 'mine' })
    expect(res.statusCode).toBe(200)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('unauthenticated → 401, no write', async () => {
    currentUserId = null
    const res = await dispatch(router, 'POST', '/accept', { token: 'good' })
    expect(res.statusCode).toBe(401)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('GET /received lists only the caller-accepted grants', async () => {
    db.findMany.mockResolvedValue([
      { id: 'g1', owner_user_id: 'owner-1', recipient_user_id: 'recipient-1', scope: '["labs"]' },
    ])
    db.findById.mockResolvedValue({ name: 'Dr. Owner' })
    const res = await dispatch(router, 'GET', '/received', {})
    expect(res.statusCode).toBe(200)
    const where = (db.findMany.mock.calls[0] as unknown[])[1] as {
      where: Array<Record<string, unknown>>
    }
    expect(where.where).toEqual(
      expect.arrayContaining([{ field: 'recipient_user_id', operator: '=', value: 'recipient-1' }]),
    )
    expect(res.body).toMatchObject([{ scope: ['labs'], owner_name: 'Dr. Owner' }])
  })
})
