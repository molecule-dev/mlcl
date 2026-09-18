import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The middleware designates the documentation operator via the ADMIN_EMAILS
// allow-list, read at module-evaluation time — set it before the SUT import.
process.env.ADMIN_EMAILS = 'owner@docs.com'

const findById = vi.fn()
const updateById = vi.fn()
const getUserId = vi.fn()

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: unknown) => getUserId(res),
}))

vi.mock('@molecule/api-database', () => ({
  findById: (...args: unknown[]) => findById(...args),
  updateById: (...args: unknown[]) => updateById(...args),
}))

// i18n stub returns the English defaultValue so assertions stay readable.
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

type MockRes = Response & {
  statusCode?: number
  body?: unknown
}

const makeRes = (userId?: string): MockRes => {
  getUserId.mockReturnValue(userId ?? null)
  const res = {
    locals: { session: userId ? { userId } : undefined },
  } as unknown as MockRes
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  }) as unknown as Response['status']
  res.json = vi.fn((payload: unknown) => {
    res.body = payload
    return res
  }) as unknown as Response['json']
  return res
}

describe('requireAdmin middleware (security finding P2H-2)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when there is no authenticated session', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    const res = makeRes(undefined)
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
    expect(findById).not.toHaveBeenCalled()
  })

  it('returns 403 for an authenticated non-admin developer (blocks catalog injection)', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'user-1', email: 'dev@example.com', role: 'member' })
    const res = makeRes('user-1')
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
    expect(updateById).not.toHaveBeenCalled()
  })

  it('calls next() for a user whose role is already admin', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'user-2', email: 'someone@example.com', role: 'admin' })
    const res = makeRes('user-2')
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('promotes and admits a user on the ADMIN_EMAILS allow-list', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'owner-1', email: 'Owner@Docs.com', role: 'member' })
    updateById.mockResolvedValue({ data: {} })
    const res = makeRes('owner-1')
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(updateById).toHaveBeenCalledWith('users', 'owner-1', { role: 'admin' })
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 when the session user no longer exists', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue(null)
    const res = makeRes('ghost')
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })
})
