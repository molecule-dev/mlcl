import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The recipient side of trip collaboration: POST /collaborators/accept redeems the
// emailed ?invite=<token> and adds the signed-in user as a real collaborator (so
// trips.ts GET /:id grants them read access). The token is single-use (the invite
// row is deleted), unknown tokens 404 without probing, and re-accepting is idempotent.

let currentUserId: string | null = 'recipient-1'

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUserId,
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
}))

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

vi.mock('@molecule/api-emails', () => ({ hasTransport: () => false, sendMail: vi.fn() }))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
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
  status: (c: number) => MockRes
  json: (p: unknown) => MockRes
  end: () => MockRes
}
function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: undefined,
    ended: false,
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

describe('trip collaborator accept — token flow', () => {
  let router: (req: Request, res: Response, next: (err?: unknown) => void) => void
  beforeEach(async () => {
    vi.resetAllMocks()
    currentUserId = 'recipient-1'
    router = (await import('../handlers/collaborators.js')).default as unknown as typeof router
  })

  it('redeems a valid token: adds the collaborator + consumes the invite (200)', async () => {
    db.findMany
      .mockResolvedValueOnce([{ id: 'inv1', trip_id: 't1', user_id: 'owner-1', role: 'editor' }]) // token lookup
      .mockResolvedValueOnce([]) // not yet a collaborator
    db.create.mockResolvedValue({ data: {} })
    db.deleteById.mockResolvedValue(undefined)
    const res = await dispatch(router, 'POST', '/accept', { token: 'good' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ trip_id: 't1', role: 'editor' })
    expect(db.create).toHaveBeenCalledTimes(1)
    expect((db.create.mock.calls[0] as unknown[])[1]).toMatchObject({
      trip_id: 't1',
      user_id: 'recipient-1',
    })
    expect(db.deleteById).toHaveBeenCalledWith('trip_invites', 'inv1')
  })

  it('unknown/consumed token → 404, no collaborator created', async () => {
    db.findMany.mockResolvedValueOnce([])
    const res = await dispatch(router, 'POST', '/accept', { token: 'nope' })
    expect(res.statusCode).toBe(404)
    expect(db.create).not.toHaveBeenCalled()
  })

  it('idempotent when already a collaborator: no duplicate row, still consumes invite (200)', async () => {
    db.findMany
      .mockResolvedValueOnce([{ id: 'inv1', trip_id: 't1', user_id: 'owner-1', role: 'viewer' }])
      .mockResolvedValueOnce([{ id: 'c1', trip_id: 't1', user_id: 'recipient-1' }])
    db.deleteById.mockResolvedValue(undefined)
    const res = await dispatch(router, 'POST', '/accept', { token: 'again' })
    expect(res.statusCode).toBe(200)
    expect(db.create).not.toHaveBeenCalled()
    expect(db.deleteById).toHaveBeenCalledWith('trip_invites', 'inv1')
  })

  it('unauthenticated → 401, no write', async () => {
    currentUserId = null
    const res = await dispatch(router, 'POST', '/accept', { token: 'good' })
    expect(res.statusCode).toBe(401)
    expect(db.create).not.toHaveBeenCalled()
    expect(db.deleteById).not.toHaveBeenCalled()
  })
})
