import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The middleware designates the league operator via the ADMIN_EMAILS allow-list,
// read at module-evaluation time — set it before the SUT is imported.
process.env.ADMIN_EMAILS = 'commissioner@league.com'

const findById = vi.fn()
const updateById = vi.fn()

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

const makeRes = (session?: { userId?: string }): MockRes => {
  const res = {
    locals: { session },
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

// Every gated write route in this app delegates authorization to the SAME
// `requireAdmin` middleware (schedule POST/PUT/DELETE + postpone; scores
// POST/:gameId(/start|/final|/events); players POST/PUT/DELETE) or to the
// `isAdmin` predicate it shares (team roster/edit owner-OR-admin). Exercising
// both here covers the authorization contract for every gated route: a normal
// authenticated user is rejected (403) and a league operator (admin) is admitted.
describe('requireAdmin middleware — shared-league catalog write gate', () => {
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

  it('returns 401 when the session user no longer exists', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue(null)
    const res = makeRes({ userId: 'ghost' })
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 for a normal authenticated user (the broken-access path)', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'user-1', email: 'fan@example.com', role: 'user' })
    const res = makeRes({ userId: 'user-1' })
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
    expect(updateById).not.toHaveBeenCalled()
  })

  it('calls next() for a user whose role is already admin', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'user-2', email: 'someone@example.com', role: 'admin' })
    const res = makeRes({ userId: 'user-2' })
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('promotes and admits a user on the ADMIN_EMAILS allow-list', async () => {
    const { requireAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'op-1', email: 'Commissioner@League.com', role: 'user' })
    updateById.mockResolvedValue({ data: {} })
    const res = makeRes({ userId: 'op-1' })
    const next = vi.fn() as unknown as NextFunction

    await requireAdmin({} as Request, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(updateById).toHaveBeenCalledWith('users', 'op-1', { role: 'admin' })
    expect(res.status).not.toHaveBeenCalled()
  })
})

// `isAdmin` backs the owner-OR-admin team routes (PUT/DELETE /teams/:id,
// POST /teams/:id/roster). It must NEVER fall open: a missing user or a
// non-admin returns false so a null-owner team cannot be written by just any
// authenticated user.
describe('isAdmin predicate — owner-OR-admin team routes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('is false for a normal authenticated user', async () => {
    const { isAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'user-1', email: 'fan@example.com', role: 'user' })

    expect(await isAdmin('user-1')).toBe(false)
    expect(updateById).not.toHaveBeenCalled()
  })

  it('is false when the user does not exist (never falls open)', async () => {
    const { isAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue(null)

    expect(await isAdmin('ghost')).toBe(false)
  })

  it('is true for a role=admin user', async () => {
    const { isAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'user-2', email: 'someone@example.com', role: 'admin' })

    expect(await isAdmin('user-2')).toBe(true)
  })

  it('is true for and promotes an ADMIN_EMAILS allow-list user', async () => {
    const { isAdmin } = await import('../middleware/require-admin.js')
    findById.mockResolvedValue({ id: 'op-1', email: 'commissioner@league.com', role: 'user' })
    updateById.mockResolvedValue({ data: {} })

    expect(await isAdmin('op-1')).toBe(true)
    expect(updateById).toHaveBeenCalledWith('users', 'op-1', { role: 'admin' })
  })
})
